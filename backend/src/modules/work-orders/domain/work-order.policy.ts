import { ForbiddenActionError, InvalidTransitionError } from '../../../common/errors/domain.errors';
import { Role } from '../../users/domain/role.enum';
import { Actor } from '../../users/domain/user';
import { WorkOrderStatus as S } from './work-order-status.enum';

/**
 * Single source of truth for the Work Order workflow.
 *
 * Every use case calls `assertCan` before changing anything, and the API returns
 * `availableActions` on every work order, so the frontend renders exactly the
 * buttons this table allows and never duplicates the rules.
 */
export enum WorkOrderAction {
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  SUBMIT = 'SUBMIT',
  ASSIGN = 'ASSIGN',
  UPDATE = 'UPDATE',
  REQUEST_SPAREPART = 'REQUEST_SPAREPART',
  APPROVE_SPAREPART = 'APPROVE_SPAREPART',
  REJECT_SPAREPART = 'REJECT_SPAREPART',
  START = 'START',
  COMPLETE = 'COMPLETE',
}

interface TransitionRule {
  role: Role;
  from: readonly S[];
  /** Resulting status; `null` for DELETE (the row is removed). */
  to: S | null;
  /** Only the mechanic assigned to the work order may perform it. */
  assignedMechanicOnly?: boolean;
  /** Used in error messages: "Cannot <label>: ...". */
  label: string;
}

export const TRANSITIONS: Readonly<Record<WorkOrderAction, TransitionRule>> = {
  [WorkOrderAction.EDIT]: { role: Role.ADMIN, from: [S.DRAFT], to: S.DRAFT, label: 'edit' },
  [WorkOrderAction.DELETE]: { role: Role.ADMIN, from: [S.DRAFT], to: null, label: 'delete' },
  [WorkOrderAction.SUBMIT]: { role: Role.ADMIN, from: [S.DRAFT], to: S.SUBMITTED, label: 'submit' },
  // ASSIGNED -> ASSIGNED = reassign before the Admin's follow-up update.
  [WorkOrderAction.ASSIGN]: {
    role: Role.SPV,
    from: [S.SUBMITTED, S.ASSIGNED],
    to: S.ASSIGNED,
    label: 'assign a mechanic',
  },
  [WorkOrderAction.UPDATE]: { role: Role.ADMIN, from: [S.ASSIGNED], to: S.UPDATED, label: 'update' },
  [WorkOrderAction.REQUEST_SPAREPART]: {
    role: Role.MECHANIC,
    from: [S.UPDATED],
    to: S.WAITING_SPAREPART,
    assignedMechanicOnly: true,
    label: 'request spareparts',
  },
  [WorkOrderAction.APPROVE_SPAREPART]: {
    role: Role.SPV,
    from: [S.WAITING_SPAREPART],
    to: S.READY_TO_WORK,
    label: 'approve the sparepart request',
  },
  // After a rejection the mechanic decides again: revised request or start without parts.
  [WorkOrderAction.REJECT_SPAREPART]: {
    role: Role.SPV,
    from: [S.WAITING_SPAREPART],
    to: S.UPDATED,
    label: 'reject the sparepart request',
  },
  // UPDATED -> WORKING is the "no sparepart needed" branch.
  [WorkOrderAction.START]: {
    role: Role.MECHANIC,
    from: [S.UPDATED, S.READY_TO_WORK],
    to: S.WORKING,
    assignedMechanicOnly: true,
    label: 'start',
  },
  [WorkOrderAction.COMPLETE]: { role: Role.ADMIN, from: [S.WORKING], to: S.COMPLETED, label: 'complete' },
};

/** The parts of a work order the policy needs to decide. */
export interface WorkOrderState {
  status: S;
  assignedMechanicId: string | null;
}

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; kind: 'forbidden' | 'invalid-transition'; message: string };

export function evaluate(action: WorkOrderAction, wo: WorkOrderState, actor: Actor): PolicyDecision {
  const rule = TRANSITIONS[action];

  if (actor.role !== rule.role) {
    return { allowed: false, kind: 'forbidden', message: `Only ${rule.role} can ${rule.label}` };
  }
  if (rule.assignedMechanicOnly && wo.assignedMechanicId !== actor.id) {
    return {
      allowed: false,
      kind: 'forbidden',
      message: `Only the assigned mechanic can ${rule.label} this work order`,
    };
  }
  if (!rule.from.includes(wo.status)) {
    return {
      allowed: false,
      kind: 'invalid-transition',
      message: `Cannot ${rule.label}: status is ${wo.status}`,
    };
  }
  return { allowed: true };
}

export function canPerform(action: WorkOrderAction, wo: WorkOrderState, actor: Actor): boolean {
  return evaluate(action, wo, actor).allowed;
}

/** Throws ForbiddenActionError (403) or InvalidTransitionError (409); returns the next status. */
export function assertCan(action: WorkOrderAction, wo: WorkOrderState, actor: Actor): S | null {
  const decision = evaluate(action, wo, actor);
  if (!decision.allowed) {
    throw decision.kind === 'forbidden'
      ? new ForbiddenActionError(decision.message)
      : new InvalidTransitionError(decision.message);
  }
  return TRANSITIONS[action].to;
}

export function availableActions(wo: WorkOrderState, actor: Actor): WorkOrderAction[] {
  return (Object.keys(TRANSITIONS) as WorkOrderAction[]).filter((a) => canPerform(a, wo, actor));
}

/** Creating is not a transition (no current status), only a role check. */
export function canCreate(actor: Actor): boolean {
  return actor.role === Role.ADMIN;
}
