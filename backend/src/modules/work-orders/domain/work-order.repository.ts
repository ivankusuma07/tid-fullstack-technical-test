import { NewWorkOrder, WorkOrder, WorkOrderDetail, WorkOrderView } from './work-order';
import { WorkOrderStatus } from './work-order-status.enum';

export const WORK_ORDER_REPOSITORY = Symbol('WORK_ORDER_REPOSITORY');

export interface WorkOrderListCriteria {
  status?: WorkOrderStatus;
  /** Only work orders assigned to this mechanic. */
  assignedMechanicId?: string;
  /** Statuses hidden from the actor (mechanics never see DRAFT). */
  excludeStatuses?: WorkOrderStatus[];
  /** Matches title, WO number or fleet number (case-insensitive). */
  search?: string;
  page: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkOrderRepository {
  nextWoNumber(now: Date): Promise<string>;
  create(data: NewWorkOrder): Promise<WorkOrder>;
  /** `lock: true` takes a row lock (SELECT ... FOR UPDATE) when called inside a transaction. */
  findById(id: string, options?: { lock?: boolean }): Promise<WorkOrder | null>;
  findDetailById(id: string): Promise<WorkOrderDetail | null>;
  list(criteria: WorkOrderListCriteria): Promise<Page<WorkOrderView>>;
  /** Persists the mutable fields of an existing work order. */
  save(workOrder: WorkOrder): Promise<WorkOrder>;
  delete(id: string): Promise<void>;
}
