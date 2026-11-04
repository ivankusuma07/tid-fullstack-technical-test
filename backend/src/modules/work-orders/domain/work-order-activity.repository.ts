import { NewWorkOrderActivity } from './work-order-activity';

/** Append-only log. Reading happens through WorkOrderRepository.findDetailById. */
export interface WorkOrderActivityRepository {
  record(activity: NewWorkOrderActivity): Promise<void>;
}
