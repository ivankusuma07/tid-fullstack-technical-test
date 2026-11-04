import { SparepartRequestRepository } from '../../sparepart-requests/domain/sparepart-request.repository';
import { WorkOrderRepository } from '../domain/work-order.repository';
import { WorkOrderActivityRepository } from '../domain/work-order-activity.repository';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/** Repositories bound to one database transaction. */
export interface TransactionalRepositories {
  workOrders: WorkOrderRepository;
  sparepartRequests: SparepartRequestRepository;
  activities: WorkOrderActivityRepository;
}

/**
 * Runs `work` atomically: everything commits together or nothing does.
 * Every state change and its timeline entry go through here, so they can never disagree.
 */
export interface UnitOfWork {
  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T>;
}
