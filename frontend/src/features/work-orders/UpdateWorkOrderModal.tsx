import { useState } from 'react';
import type { WorkOrder } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Field, Input, Textarea } from '../../components/ui';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';

/** Admin "Update (lanjutan)": follow-up details after assignment; then the mechanic decides on spareparts. */
export function UpdateWorkOrderModal({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  const { update } = useWorkOrderActions();
  const [title, setTitle] = useState(workOrder.title);
  const [description, setDescription] = useState(workOrder.description ?? '');

  return (
    <Modal
      title={`Update (lanjutan): ${workOrder.woNumber}`}
      onClose={onClose}
      submitLabel="Save & hand over to mechanic"
      submitting={update.isPending}
      onSubmit={() => update.mutate({ id: workOrder.id, title, description }, { onSuccess: onClose })}
    >
      <Field label="Title">
        <Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description / follow-up notes" hint="After this step the assigned mechanic decides whether spareparts are needed.">
        <Textarea rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
    </Modal>
  );
}
