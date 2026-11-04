import type { WorkOrder } from '../../api/types';
import { Modal } from '../../components/Modal';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';

export function DeleteWorkOrderDialog({
  workOrder,
  onClose,
  onDeleted,
}: {
  workOrder: WorkOrder;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { deleteDraft } = useWorkOrderActions();

  return (
    <Modal
      title="Delete draft"
      onClose={onClose}
      submitLabel="Delete"
      submitVariant="danger"
      submitting={deleteDraft.isPending}
      onSubmit={() =>
        deleteDraft.mutate(
          { id: workOrder.id, woNumber: workOrder.woNumber },
          {
            onSuccess: () => {
              onClose();
              onDeleted?.();
            },
          },
        )
      }
    >
      <p className="text-sm text-slate-700">
        Delete <strong>{workOrder.woNumber}</strong> ({workOrder.title})? This can't be undone.
      </p>
    </Modal>
  );
}
