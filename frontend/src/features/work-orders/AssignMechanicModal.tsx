import { useState } from 'react';
import type { WorkOrder } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Wrench } from 'lucide-react';
import { Field, Select } from '../../components/ui';
import { useMechanics } from '../../hooks/useWorkOrders';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';

/** SPV: assign (or reassign, while still ASSIGNED) a mechanic. */
export function AssignMechanicModal({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  const { assign } = useWorkOrderActions();
  const { data: mechanics = [], isLoading } = useMechanics();
  const [mechanicId, setMechanicId] = useState(workOrder.assignedMechanic?.id ?? '');

  return (
    <Modal
      title={`${workOrder.assignedMechanic ? 'Reassign' : 'Assign'} mechanic: ${workOrder.woNumber}`}
      onClose={onClose}
      submitLabel="Assign"
      submitting={assign.isPending}
      onSubmit={() => assign.mutate({ id: workOrder.id, mechanicId }, { onSuccess: onClose })}
    >
      <Field label="Mechanic">
        <Select icon={Wrench} required value={mechanicId} onChange={(e) => setMechanicId(e.target.value)} disabled={isLoading}>
          <option value="" disabled>
            Select a mechanic…
          </option>
          {mechanics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
