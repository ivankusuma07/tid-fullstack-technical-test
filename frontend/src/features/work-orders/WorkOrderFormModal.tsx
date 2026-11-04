import { useState } from 'react';
import type { WorkOrder, WorkOrderDetail } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Field, Input, Textarea } from '../../components/ui';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';
import { browserTimeZone, toIso, toLocalInput } from '../../lib/datetime';

interface Props {
  /** Present = edit the draft; absent = create. */
  workOrder?: WorkOrder;
  onClose: () => void;
  onCreated?: (wo: WorkOrderDetail) => void;
}

/** Admin: create a work order, or edit it while it is still DRAFT. */
export function WorkOrderFormModal({ workOrder, onClose, onCreated }: Props) {
  const { create, editDraft } = useWorkOrderActions();
  const [title, setTitle] = useState(workOrder?.title ?? '');
  const [description, setDescription] = useState(workOrder?.description ?? '');
  const [fleetNumber, setFleetNumber] = useState(workOrder?.fleetNumber ?? '');
  const [breakdownTime, setBreakdownTime] = useState(toLocalInput(workOrder?.breakdownTime ?? new Date()));
  const maxLocal = toLocalInput(new Date());

  const mutation = workOrder ? editDraft : create;

  const submit = () => {
    const values = { title, description, fleetNumber, breakdownTime: toIso(breakdownTime) };
    if (workOrder) {
      editDraft.mutate({ id: workOrder.id, values }, { onSuccess: onClose });
    } else {
      create.mutate(values, {
        onSuccess: (wo) => {
          onClose();
          onCreated?.(wo);
        },
      });
    }
  };

  return (
    <Modal
      title={workOrder ? `Edit ${workOrder.woNumber}` : 'New Work Order'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={workOrder ? 'Save draft' : 'Create draft'}
      submitting={mutation.isPending}
    >
      <Field label="Fleet number" hint="The vehicle, e.g. DT-0035 (saved in upper case)">
        <Input
          required
          maxLength={20}
          value={fleetNumber}
          onChange={(e) => setFleetNumber(e.target.value)}
          placeholder="DT-0035"
          autoFocus
          className="uppercase placeholder:normal-case"
        />
      </Field>
      <Field label="Title">
        <Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Engine overheating" />
      </Field>
      <Field label="Description (optional)">
        <Textarea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Breakdown time" hint={`When the vehicle broke down. Your timezone: ${browserTimeZone}`}>
        <Input
          type="datetime-local"
          required
          max={maxLocal}
          value={breakdownTime}
          onChange={(e) => setBreakdownTime(e.target.value)}
        />
      </Field>
    </Modal>
  );
}
