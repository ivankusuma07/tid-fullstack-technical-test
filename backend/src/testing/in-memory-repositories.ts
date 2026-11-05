import { randomUUID } from 'crypto';
import { Clock } from '../common/application/clock';
import {
  TransactionalRepositories,
  UnitOfWork,
} from '../modules/work-orders/application/unit-of-work';
import { NewWorkOrderActivity, WorkOrderActivity } from '../modules/work-orders/domain/work-order-activity';
import { WorkOrderActivityRepository } from '../modules/work-orders/domain/work-order-activity.repository';
import { NewSparepartRequest, SparepartRequest } from '../modules/sparepart-requests/domain/sparepart-request';
import { SparepartRequestRepository } from '../modules/sparepart-requests/domain/sparepart-request.repository';
import { SparepartRequestStatus } from '../modules/sparepart-requests/domain/sparepart-request-status.enum';
import { Role } from '../modules/users/domain/role.enum';
import { User, UserSummary } from '../modules/users/domain/user';
import { UserRepository } from '../modules/users/domain/user.repository';
import { Vehicle, VehicleRepository } from '../modules/vehicles/domain/vehicle';
import { NewWorkOrder, WorkOrder, WorkOrderDetail, WorkOrderView } from '../modules/work-orders/domain/work-order';
import {
  Page,
  WorkOrderListCriteria,
  WorkOrderRepository,
} from '../modules/work-orders/domain/work-order.repository';

/**
 * In-memory implementations of the repository interfaces, used by unit tests.
 * They are the reason the interfaces exist: services run without a database.
 */

const clone = <T>(v: T): T => structuredClone(v);

export class InMemoryUserRepository implements UserRepository {
  constructor(public readonly users: User[] = []) {}

  async findById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findAll(filter: { role?: Role } = {}) {
    return this.users.filter((u) => !filter.role || u.role === filter.role);
  }

  summary(id: string): UserSummary {
    const u = this.users.find((x) => x.id === id)!;
    return { id: u.id, name: u.name, role: u.role };
  }
}

export class InMemoryVehicleRepository implements VehicleRepository {
  constructor(public readonly vehicles: Vehicle[] = []) {}

  async findById(id: string) {
    return this.vehicles.find((v) => v.id === id) ?? null;
  }

  async findAll() {
    return [...this.vehicles];
  }

  get(id: string): Vehicle {
    return this.vehicles.find((v) => v.id === id)!;
  }
}

export class InMemorySparepartRequestRepository implements SparepartRequestRepository {
  readonly rows: SparepartRequest[] = [];

  async create(data: NewSparepartRequest) {
    const now = new Date();
    const row: SparepartRequest = {
      id: randomUUID(),
      workOrderId: data.workOrderId,
      status: SparepartRequestStatus.PENDING,
      requestNote: data.requestNote,
      requestedById: data.requestedById,
      approvedById: null,
      approvalNote: null,
      items: data.items.map((i) => ({ id: randomUUID(), ...i })),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return clone(row);
  }

  async findById(id: string) {
    const row = this.rows.find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async findPendingByWorkOrder(workOrderId: string) {
    const row = this.rows.find((r) => r.workOrderId === workOrderId && r.status === SparepartRequestStatus.PENDING);
    return row ? clone(row) : null;
  }

  async save(request: SparepartRequest) {
    const i = this.rows.findIndex((r) => r.id === request.id);
    this.rows[i] = { ...clone(request), updatedAt: new Date() };
    return clone(this.rows[i]);
  }
}

export class InMemoryActivityRepository implements WorkOrderActivityRepository {
  readonly rows: WorkOrderActivity[] = [];

  async record(activity: NewWorkOrderActivity) {
    this.rows.push({ sparepartRequestId: null, ...activity, id: randomUUID(), createdAt: new Date() });
  }
}

export class InMemoryWorkOrderRepository implements WorkOrderRepository {
  readonly rows: WorkOrder[] = [];
  private seq = 0;

  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly requests: InMemorySparepartRequestRepository,
    private readonly activities: InMemoryActivityRepository,
    private readonly vehicles: InMemoryVehicleRepository,
  ) {}

  async nextWoNumber(now: Date) {
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `WO-${ymd}-${String(++this.seq).padStart(4, '0')}`;
  }

  async create(data: NewWorkOrder) {
    const now = new Date();
    const row: WorkOrder = {
      ...data,
      id: randomUUID(),
      assignedMechanicId: null,
      startDate: null,
      endDate: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return clone(row);
  }

  async findById(id: string) {
    const row = this.rows.find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async findDetailById(id: string): Promise<WorkOrderDetail | null> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return null;
    const sparepartRequests = this.requests.rows
      .filter((r) => r.workOrderId === id)
      .map((r) => ({
        ...clone(r),
        requestedBy: this.users.summary(r.requestedById),
        approvedBy: r.approvedById ? this.users.summary(r.approvedById) : null,
      }))
      .reverse();
    const activities = this.activities.rows
      .filter((a) => a.workOrderId === id)
      .map((a) => ({ ...clone(a), actor: this.users.summary(a.actorId) }));
    return { ...this.toView(row), sparepartRequests, activities };
  }

  async list(c: WorkOrderListCriteria): Promise<Page<WorkOrderView>> {
    const term = c.search?.toLowerCase();
    const filtered = this.rows
      .filter((r) => !c.status || r.status === c.status)
      .filter((r) => !c.assignedMechanicId || r.assignedMechanicId === c.assignedMechanicId)
      .filter(
        (r) => !term || [r.title, r.woNumber, this.vehicles.get(r.vehicleId).fleetNumber].some((f) => f.toLowerCase().includes(term)),
      )
      .reverse();
    const start = (c.page - 1) * c.limit;
    return {
      items: filtered.slice(start, start + c.limit).map((r) => this.toView(r)),
      total: filtered.length,
      page: c.page,
      limit: c.limit,
    };
  }

  async save(wo: WorkOrder) {
    const i = this.rows.findIndex((r) => r.id === wo.id);
    this.rows[i] = { ...clone(wo), updatedAt: new Date() };
    return clone(this.rows[i]);
  }

  async delete(id: string) {
    const i = this.rows.findIndex((r) => r.id === id);
    if (i >= 0) this.rows.splice(i, 1);
  }

  private toView(row: WorkOrder): WorkOrderView {
    return {
      ...clone(row),
      vehicle: this.vehicles.get(row.vehicleId),
      createdBy: this.users.summary(row.createdById),
      assignedMechanic: row.assignedMechanicId ? this.users.summary(row.assignedMechanicId) : null,
    };
  }
}

/** No real transaction; good enough to exercise the service logic. */
export class InMemoryUnitOfWork implements UnitOfWork {
  constructor(private readonly repos: TransactionalRepositories) {}

  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    return work(this.repos);
  }
}

export class FixedClock implements Clock {
  constructor(public current: Date) {}

  now() {
    return new Date(this.current);
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}
