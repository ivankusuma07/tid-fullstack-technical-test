import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../common/application/clock';
import { ForbiddenActionError, NotFoundError, ValidationError } from '../../../common/errors/domain.errors';
import { Role } from '../../users/domain/role.enum';
import { Actor } from '../../users/domain/user';
import { USER_REPOSITORY, UserRepository } from '../../users/domain/user.repository';
import { VEHICLE_REPOSITORY, VehicleRepository } from '../../vehicles/domain/vehicle';
import { WorkOrder, WorkOrderDetail, WorkOrderView } from '../domain/work-order';
import { assertCan, availableActions, canCreate, WorkOrderAction } from '../domain/work-order.policy';
import { Page, WORK_ORDER_REPOSITORY, WorkOrderRepository } from '../domain/work-order.repository';
import { WorkOrderStatus } from '../domain/work-order-status.enum';
import { TransactionalRepositories, UNIT_OF_WORK, UnitOfWork } from './unit-of-work';
import {
  CreateWorkOrderInput,
  EditDraftInput,
  ListWorkOrdersInput,
  UpdateWorkOrderInput,
} from './work-order.inputs';

export type WithActions<T> = T & { availableActions: WorkOrderAction[] };

/** Browser and server clocks are never perfectly in sync; allow a small drift for "not in the future" rules. */
const CLOCK_SKEW_MS = 60_000;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class WorkOrdersService {
  constructor(
    /** Used for reads; writes go through the unit of work. */
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // ---------- queries ----------

  async list(actor: Actor, input: ListWorkOrdersInput = {}): Promise<Page<WithActions<WorkOrderView>>> {
    // Mechanics only ever see the work orders assigned to them (never drafts, which are unassigned).
    const page = await this.workOrders.list({
      status: input.status,
      search: input.search?.trim() || undefined,
      assignedMechanicId: actor.role === Role.MECHANIC ? actor.id : undefined,
      page: Math.max(1, input.page ?? 1),
      limit: Math.min(MAX_PAGE_SIZE, Math.max(1, input.limit ?? 10)),
    });

    return { ...page, items: page.items.map((wo) => this.withActions(wo, actor)) };
  }

  async getById(actor: Actor, id: string): Promise<WithActions<WorkOrderDetail>> {
    const wo = await this.workOrders.findDetailById(id);
    if (!wo || !this.isVisibleTo(wo, actor)) throw new NotFoundError('Work order', id);
    return this.withActions(wo, actor);
  }

  // ---------- commands ----------

  async create(actor: Actor, input: CreateWorkOrderInput): Promise<WithActions<WorkOrderDetail>> {
    if (!canCreate(actor)) throw new ForbiddenActionError('Only ADMIN can create a work order');

    const data = {
      title: this.requireText(input.title, 'Title'),
      description: this.optionalText(input.description),
      vehicleId: await this.requireVehicle(input.vehicleId),
      breakdownTime: this.notInFuture(input.breakdownTime, 'Breakdown time'),
      status: WorkOrderStatus.DRAFT,
      createdById: actor.id,
    };

    const id = await this.uow.run(async ({ workOrders, activities }) => {
      const created = await workOrders.create({ ...data, woNumber: await workOrders.nextWoNumber(this.clock.now()) });
      await activities.record({
        workOrderId: created.id,
        actorId: actor.id,
        action: 'CREATE',
        fromStatus: null,
        toStatus: WorkOrderStatus.DRAFT,
        note: null,
      });
      return created.id;
    });
    return this.getById(actor, id);
  }

  async editDraft(actor: Actor, id: string, input: EditDraftInput) {
    const vehicleId = input.vehicleId !== undefined ? await this.requireVehicle(input.vehicleId) : undefined;
    return this.transition(actor, id, WorkOrderAction.EDIT, (wo) => {
      if (input.title !== undefined) wo.title = this.requireText(input.title, 'Title');
      if (input.description !== undefined) wo.description = this.optionalText(input.description);
      if (vehicleId) wo.vehicleId = vehicleId;
      if (input.breakdownTime !== undefined) {
        wo.breakdownTime = this.notInFuture(input.breakdownTime, 'Breakdown time');
      }
    });
  }

  /** Hard delete; the timeline goes with it (ON DELETE CASCADE), as nobody else has acted on a draft. */
  async deleteDraft(actor: Actor, id: string): Promise<void> {
    await this.uow.run(async ({ workOrders }) => {
      const wo = await this.load(workOrders, id);
      assertCan(WorkOrderAction.DELETE, wo, actor);
      await workOrders.delete(id);
    });
  }

  submit(actor: Actor, id: string) {
    return this.transition(actor, id, WorkOrderAction.SUBMIT);
  }

  async assign(actor: Actor, id: string, mechanicId: string) {
    const mechanic = await this.users.findById(mechanicId);
    if (!mechanic) throw new ValidationError(`User ${mechanicId} does not exist`);
    if (mechanic.role !== Role.MECHANIC) throw new ValidationError(`${mechanic.name} is not a mechanic`);

    return this.transition(actor, id, WorkOrderAction.ASSIGN, (wo) => {
      const reassigned = wo.assignedMechanicId !== null && wo.assignedMechanicId !== mechanic.id;
      wo.assignedMechanicId = mechanic.id;
      return `${reassigned ? 'Reassigned' : 'Assigned'} to ${mechanic.name}`;
    });
  }

  /** "Update (lanjutan)": the Admin's follow-up after assignment. */
  update(actor: Actor, id: string, input: UpdateWorkOrderInput) {
    return this.transition(actor, id, WorkOrderAction.UPDATE, (wo) => {
      if (input.title !== undefined) wo.title = this.requireText(input.title, 'Title');
      if (input.description !== undefined) wo.description = this.optionalText(input.description);
    });
  }

  start(actor: Actor, id: string) {
    return this.transition(actor, id, WorkOrderAction.START, (wo) => {
      wo.startDate = this.clock.now();
    });
  }

  complete(actor: Actor, id: string, endDate: Date) {
    return this.transition(actor, id, WorkOrderAction.COMPLETE, (wo) => {
      this.notInFuture(endDate, 'End date');
      if (wo.startDate && endDate.getTime() < wo.startDate.getTime()) {
        throw new ValidationError('End date cannot be before the start date');
      }
      wo.endDate = endDate;
    });
  }

  // ---------- helpers ----------

  /**
   * In one transaction: lock the row, check the policy, apply changes, set the next status,
   * save, and append the timeline entry. `apply` may return a note for the timeline.
   */
  private async transition(
    actor: Actor,
    id: string,
    action: WorkOrderAction,
    apply?: (wo: WorkOrder) => string | void,
  ): Promise<WithActions<WorkOrderDetail>> {
    await this.uow.run(async ({ workOrders, activities }) => {
      const wo = await this.load(workOrders, id);
      const from = wo.status;
      const next = assertCan(action, wo, actor);
      const note = apply?.(wo) ?? null;
      if (next) wo.status = next;
      await workOrders.save(wo);
      await activities.record({ workOrderId: id, actorId: actor.id, action, fromStatus: from, toStatus: wo.status, note });
    });
    return this.getById(actor, id);
  }

  private async load(workOrders: TransactionalRepositories['workOrders'], id: string): Promise<WorkOrder> {
    const wo = await workOrders.findById(id, { lock: true });
    if (!wo) throw new NotFoundError('Work order', id);
    return wo;
  }

  /** Admin and SPV see every work order; a mechanic only the ones assigned to them (404 otherwise). */
  private isVisibleTo(wo: WorkOrder, actor: Actor): boolean {
    return actor.role !== Role.MECHANIC || wo.assignedMechanicId === actor.id;
  }

  private withActions<T extends WorkOrder>(wo: T, actor: Actor): WithActions<T> {
    return { ...wo, availableActions: availableActions(wo, actor) };
  }

  private requireText(value: string, field: string): string {
    const trimmed = value?.trim();
    if (!trimmed) throw new ValidationError(`${field} is required`);
    return trimmed;
  }

  private optionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async requireVehicle(vehicleId: string): Promise<string> {
    const vehicle = vehicleId ? await this.vehicles.findById(vehicleId) : null;
    if (!vehicle) throw new ValidationError(`Vehicle ${vehicleId} does not exist`);
    return vehicle.id;
  }

  private notInFuture(date: Date, field: string): Date {
    if (Number.isNaN(date.getTime())) throw new ValidationError(`${field} is not a valid date`);
    if (date.getTime() > this.clock.now().getTime() + CLOCK_SKEW_MS) {
      throw new ValidationError(`${field} cannot be in the future`);
    }
    return date;
  }
}
