import { useState } from 'react';
import type { WorkOrder, WorkOrderAction } from '../../api/types';
import { Button, Icon } from '../../components/ui';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';
import { AssignMechanicModal } from './AssignMechanicModal';
import { CompleteWorkOrderModal } from './CompleteWorkOrderModal';
import { DeleteWorkOrderDialog } from './DeleteWorkOrderDialog';
import { RequestSparepartModal } from './RequestSparepartModal';
import { ReviewSparepartModal } from './ReviewSparepartModal';
import { UpdateWorkOrderModal } from './UpdateWorkOrderModal';
import { WorkOrderFormModal } from './WorkOrderFormModal';

type ModalKind = 'edit' | 'delete' | 'assign' | 'update' | 'request' | 'review' | 'complete';

interface Props {
  workOrder: WorkOrder;
  size?: 'sm' | 'md';
  onDeleted?: () => void;
}

/**
 * Renders exactly the actions the API returned in `availableActions`.
 * No role/status rules here: the backend policy is the single source of truth.
 */
export function ActionBar({ workOrder, size = 'md', onDeleted }: Props) {
  const [open, setOpen] = useState<ModalKind | null>(null);
  const { submit, start } = useWorkOrderActions();
  const has = (a: WorkOrderAction) => workOrder.availableActions.includes(a);
  const close = () => setOpen(null);
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (workOrder.availableActions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {has('EDIT') && (
          <Button size={size} onClick={() => setOpen('edit')}>
            <Icon name="pencil" className={iconSize} /> Edit
          </Button>
        )}
        {has('DELETE') && (
          <Button size={size} onClick={() => setOpen('delete')} className="text-red-600">
            <Icon name="trash" className={iconSize} /> Delete
          </Button>
        )}
        {has('SUBMIT') && (
          <Button size={size} variant="primary" disabled={submit.isPending} onClick={() => submit.mutate(workOrder.id)}>
            <Icon name="send" className={iconSize} /> Submit
          </Button>
        )}
        {has('ASSIGN') && (
          <Button size={size} variant="primary" onClick={() => setOpen('assign')}>
            <Icon name="user" className={iconSize} /> {workOrder.assignedMechanic ? 'Reassign' : 'Assign'} Mechanic
          </Button>
        )}
        {has('UPDATE') && (
          <Button size={size} variant="primary" onClick={() => setOpen('update')}>
            <Icon name="pencil" className={iconSize} /> Update (Lanjutan)
          </Button>
        )}
        {has('REQUEST_SPAREPART') && (
          <Button size={size} onClick={() => setOpen('request')}>
            <Icon name="box" className={iconSize} /> Request Sparepart
          </Button>
        )}
        {(has('APPROVE_SPAREPART') || has('REJECT_SPAREPART')) && (
          <Button size={size} variant="primary" onClick={() => setOpen('review')}>
            <Icon name="check" className={iconSize} /> Review Sparepart
          </Button>
        )}
        {has('START') && (
          <Button size={size} variant="primary" disabled={start.isPending} onClick={() => start.mutate(workOrder.id)}>
            <Icon name="play" className={iconSize} /> Start Working
          </Button>
        )}
        {has('COMPLETE') && (
          <Button size={size} variant="primary" onClick={() => setOpen('complete')}>
            <Icon name="flag" className={iconSize} /> Complete
          </Button>
        )}
      </div>

      {open === 'edit' && <WorkOrderFormModal workOrder={workOrder} onClose={close} />}
      {open === 'delete' && <DeleteWorkOrderDialog workOrder={workOrder} onClose={close} onDeleted={onDeleted} />}
      {open === 'assign' && <AssignMechanicModal workOrder={workOrder} onClose={close} />}
      {open === 'update' && <UpdateWorkOrderModal workOrder={workOrder} onClose={close} />}
      {open === 'request' && <RequestSparepartModal workOrder={workOrder} onClose={close} />}
      {open === 'review' && <ReviewSparepartModal workOrderId={workOrder.id} onClose={close} />}
      {open === 'complete' && <CompleteWorkOrderModal workOrder={workOrder} onClose={close} />}
    </>
  );
}
