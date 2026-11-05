import { UserSummary } from '../../users/domain/user';
import { WorkOrderAction } from './work-order.policy';
import { WorkOrderStatus } from './work-order-status.enum';

/** Every workflow step, plus creation (not a transition) and free-text notes (no status change). */
export type ActivityAction = WorkOrderAction | 'CREATE' | 'NOTE';

/** Longest note a user can add to the timeline. */
export const MAX_NOTE_LENGTH = 1000;

/** One entry in a work order's timeline: who did what, and the status change it caused. */
export interface WorkOrderActivity {
  id: string;
  workOrderId: string;
  actorId: string;
  action: ActivityAction;
  fromStatus: WorkOrderStatus | null;
  toStatus: WorkOrderStatus | null;
  /** Context for the step (e.g. the assigned mechanic or the SPV's review note), or the text of a NOTE. */
  note: string | null;
  createdAt: Date;
}

export interface WorkOrderActivityView extends WorkOrderActivity {
  actor: UserSummary;
}

export type NewWorkOrderActivity = Omit<WorkOrderActivity, 'id' | 'createdAt'>;
