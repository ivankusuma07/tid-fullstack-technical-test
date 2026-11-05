import { Inject, Injectable } from '@nestjs/common';
import {
  InvalidTransitionError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain.errors';
import { Actor } from '../../users/domain/user';
import { WorkOrdersService } from '../../work-orders/application/work-orders.service';
import { WorkOrder } from '../../work-orders/domain/work-order';
import { assertCan, WorkOrderAction } from '../../work-orders/domain/work-order.policy';
import { SparepartRequest } from '../domain/sparepart-request';
import { SparepartRequestStatus } from '../domain/sparepart-request-status.enum';
import { TransactionalRepositories, UNIT_OF_WORK, UnitOfWork } from '../../work-orders/application/unit-of-work';

export interface RequestSparepartInput {
  note: string;
  items: { name: string; qty: number }[];
}

/**
 * Sparepart use cases. Each one writes the request, the work order status and a timeline
 * entry, so each runs inside a single transaction with the rows locked.
 */
@Injectable()
export class SparepartRequestsService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  /** Mechanic's "Yes, I need spareparts" decision at the UPDATED step. */
  async requestSparepart(actor: Actor, workOrderId: string, input: RequestSparepartInput) {
    const note = input.note?.trim();
    if (!note) throw new ValidationError('A note explaining why the spareparts are needed is required');
    const items = this.normalizeItems(input.items);

    await this.uow.run(async ({ workOrders, sparepartRequests, activities }) => {
      const wo = await this.lockWorkOrder(workOrders, workOrderId);
      const from = wo.status;
      const next = assertCan(WorkOrderAction.REQUEST_SPAREPART, wo, actor)!;

      if (await sparepartRequests.findPendingByWorkOrder(wo.id)) {
        throw new InvalidTransitionError('This work order already has a pending sparepart request');
      }
      const request = await sparepartRequests.create({ workOrderId: wo.id, requestNote: note, requestedById: actor.id, items });
      wo.status = next;
      await workOrders.save(wo);
      await activities.record({
        workOrderId: wo.id,
        actorId: actor.id,
        action: WorkOrderAction.REQUEST_SPAREPART,
        fromStatus: from,
        toStatus: next,
        note,
        sparepartRequestId: request.id,
      });
    });

    return this.workOrdersService.getById(actor, workOrderId);
  }

  approve(actor: Actor, requestId: string, note?: string) {
    return this.review(actor, requestId, WorkOrderAction.APPROVE_SPAREPART, note);
  }

  async reject(actor: Actor, requestId: string, note: string) {
    if (!note?.trim()) throw new ValidationError('A note explaining the rejection is required');
    return this.review(actor, requestId, WorkOrderAction.REJECT_SPAREPART, note);
  }

  private async review(
    actor: Actor,
    requestId: string,
    action: WorkOrderAction.APPROVE_SPAREPART | WorkOrderAction.REJECT_SPAREPART,
    note?: string,
  ) {
    const workOrderId = await this.uow.run(async ({ workOrders, sparepartRequests, activities }) => {
      const request = await sparepartRequests.findById(requestId, { lock: true });
      if (!request) throw new NotFoundError('Sparepart request', requestId);

      this.assertPending(request);
      const wo = await this.lockWorkOrder(workOrders, request.workOrderId);
      const from = wo.status;
      const next = assertCan(action, wo, actor)!;

      request.status =
        action === WorkOrderAction.APPROVE_SPAREPART
          ? SparepartRequestStatus.APPROVED
          : SparepartRequestStatus.REJECTED;
      request.approvedById = actor.id;
      request.approvalNote = note?.trim() || null;
      await sparepartRequests.save(request);

      wo.status = next;
      await workOrders.save(wo);
      await activities.record({
        workOrderId: wo.id,
        actorId: actor.id,
        action,
        fromStatus: from,
        toStatus: next,
        note: request.approvalNote,
        sparepartRequestId: request.id,
      });
      return wo.id;
    });

    return this.workOrdersService.getById(actor, workOrderId);
  }

  private async lockWorkOrder(
    workOrders: TransactionalRepositories['workOrders'],
    id: string,
  ): Promise<WorkOrder> {
    const wo = await workOrders.findById(id, { lock: true });
    if (!wo) throw new NotFoundError('Work order', id);
    return wo;
  }

  private assertPending(request: SparepartRequest): void {
    if (request.status !== SparepartRequestStatus.PENDING) {
      throw new InvalidTransitionError(`Sparepart request is already ${request.status}`);
    }
  }

  private normalizeItems(items: RequestSparepartInput['items']) {
    if (!items?.length) throw new ValidationError('At least one sparepart item is required');
    return items.map((item, i) => {
      const name = item.name?.trim();
      if (!name) throw new ValidationError(`Item ${i + 1}: name is required`);
      if (!Number.isInteger(item.qty) || item.qty < 1) {
        throw new ValidationError(`Item ${i + 1}: quantity must be a whole number of at least 1`);
      }
      return { name, qty: item.qty };
    });
  }
}
