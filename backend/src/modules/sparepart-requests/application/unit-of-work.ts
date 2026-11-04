import { WorkOrderRepository } from '../../work-orders/domain/work-order.repository';
import { SparepartRequestRepository } from '../domain/sparepart-request.repository';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/** Repositories bound to one database transaction. */
export interface TransactionalRepositories {
  workOrders: WorkOrderRepository;
  sparepartRequests: SparepartRequestRepository;
}

/**
 * Runs `work` atomically: everything commits together or nothing does.
 * Lets services do multi-table writes without importing TypeORM.
 */
export interface UnitOfWork {
  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T>;
}
