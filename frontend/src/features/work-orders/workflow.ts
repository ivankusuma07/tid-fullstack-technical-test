import type { WorkOrderDetail, WorkOrderStatus } from '../../api/types';

/**
 * Display-only helpers (who is the ball with). They never decide what is allowed;
 * that comes from `availableActions`.
 */
export const NEXT_STEP: Record<WorkOrderStatus, string> = {
  DRAFT: 'Admin can still edit the draft, then submit it.',
  SUBMITTED: 'Waiting for the SPV to assign a mechanic.',
  ASSIGNED: 'Waiting for the Admin to update the work order (lanjutan).',
  UPDATED: 'Waiting for the assigned mechanic: request spareparts or start working.',
  WAITING_SPAREPART: 'Waiting for the SPV to review the sparepart request.',
  READY_TO_WORK: 'Spareparts approved. Waiting for the mechanic to start.',
  WORKING: 'Mechanic is working. Admin completes it with the end date.',
  COMPLETED: 'Work order completed.',
};

export type StepState = 'done' | 'current' | 'upcoming' | 'skipped';

const ORDER: WorkOrderStatus[] = ['DRAFT', 'SUBMITTED', 'ASSIGNED', 'UPDATED', 'WAITING_SPAREPART', 'READY_TO_WORK', 'WORKING', 'COMPLETED'];

/** Steps shown in the detail page stepper. The sparepart step is optional ("No" branch). */
export function workflowSteps(wo: WorkOrderDetail): { label: string; state: StepState }[] {
  const idx = ORDER.indexOf(wo.status);
  const stateOf = (status: WorkOrderStatus): StepState => {
    const i = ORDER.indexOf(status);
    return i < idx ? 'done' : i === idx ? 'current' : 'upcoming';
  };

  const hadApproved = wo.sparepartRequests.some((r) => r.status === 'APPROVED');
  const pastDecision = idx >= ORDER.indexOf('WORKING');
  const sparepart: StepState =
    wo.status === 'WAITING_SPAREPART' || wo.status === 'READY_TO_WORK'
      ? 'current'
      : pastDecision
        ? hadApproved
          ? 'done'
          : 'skipped'
        : 'upcoming';

  return [
    { label: 'Draft', state: stateOf('DRAFT') },
    { label: 'Submitted', state: stateOf('SUBMITTED') },
    { label: 'Assigned', state: stateOf('ASSIGNED') },
    { label: 'Updated', state: stateOf('UPDATED') },
    { label: 'Sparepart', state: sparepart },
    { label: 'Working', state: stateOf('WORKING') },
    { label: 'Completed', state: wo.status === 'COMPLETED' ? 'done' : stateOf('COMPLETED') },
  ];
}
