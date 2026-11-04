import { useState } from 'react';
import type { WorkOrderAction } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Button, Field, Spinner, Textarea } from '../../components/ui';
import { useWorkOrder } from '../../hooks/useWorkOrders';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';
import { formatDateTime } from '../../lib/datetime';
import { SparepartItemsTable } from './SparepartRequestList';

/**
 * SPV: read the mechanic's note and items, then approve (optional note) or reject (note required).
 * Loads the detail itself so it can be opened from the list page too.
 */
export function ReviewSparepartModal({ workOrderId, onClose }: { workOrderId: string; onClose: () => void }) {
  const { data: wo, isLoading } = useWorkOrder(workOrderId);
  const { approveSparepart, rejectSparepart } = useWorkOrderActions();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = wo?.sparepartRequests.find((r) => r.status === 'PENDING');
  const can = (a: WorkOrderAction) => wo?.availableActions.includes(a);
  const busy = approveSparepart.isPending || rejectSparepart.isPending;

  const approve = () => pending && approveSparepart.mutate({ requestId: pending.id, note: note.trim() || undefined }, { onSuccess: onClose });
  const reject = () => {
    if (!note.trim()) return setError('A note is required to reject, so the mechanic knows why.');
    if (pending) rejectSparepart.mutate({ requestId: pending.id, note }, { onSuccess: onClose });
  };

  return (
    <Modal
      title={`Review sparepart request${wo ? `: ${wo.woNumber}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {can('REJECT_SPAREPART') && (
            <Button variant="danger" onClick={reject} disabled={busy || !pending}>
              Reject
            </Button>
          )}
          {can('APPROVE_SPAREPART') && (
            <Button variant="primary" onClick={approve} disabled={busy || !pending}>
              Approve
            </Button>
          )}
        </>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : !pending ? (
        <p className="text-sm text-slate-600">There is no pending sparepart request.</p>
      ) : (
        <>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="mb-1 text-xs text-slate-500">
              {pending.requestedBy.name} · {formatDateTime(pending.createdAt)}
            </div>
            <p className="whitespace-pre-wrap text-slate-800">{pending.requestNote}</p>
          </div>
          <SparepartItemsTable items={pending.items} />
          <Field label="SPV note" hint="Optional when approving, required when rejecting.">
            <Textarea
              maxLength={1000}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </Modal>
  );
}
