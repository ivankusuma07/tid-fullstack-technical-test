import { useState } from 'react';
import type { WorkOrder } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Field, Input } from '../../components/ui';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';
import { browserTimeZone, formatDateTime, toIso, toLocalInput } from '../../lib/datetime';

/** Admin: input the end date (local time). Bounds match the backend: >= start date, <= now. */
export function CompleteWorkOrderModal({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  const { complete } = useWorkOrderActions();
  const [endDate, setEndDate] = useState(toLocalInput(new Date()));

  /**
   * datetime-local only has minute precision, while start_date has seconds. If the Admin picks the
   * same minute the work started (e.g. the default "now" right after starting), clamp up to the
   * exact start so "end >= start" holds instead of failing by a few seconds.
   */
  const endDateIso = () => {
    const iso = toIso(endDate);
    const start = workOrder.startDate;
    if (start && new Date(iso) < new Date(start) && toLocalInput(start) === endDate) return start;
    return iso;
  };

  return (
    <Modal
      title={`Complete ${workOrder.woNumber}`}
      onClose={onClose}
      submitLabel="Complete work order"
      submitting={complete.isPending}
      onSubmit={() => complete.mutate({ id: workOrder.id, endDate: endDateIso() }, { onSuccess: onClose })}
    >
      <p className="text-sm text-slate-600">Started: {formatDateTime(workOrder.startDate)}</p>
      <Field label="End date" hint={`Your timezone: ${browserTimeZone}`}>
        <Input
          type="datetime-local"
          required
          min={workOrder.startDate ? toLocalInput(workOrder.startDate) : undefined}
          max={toLocalInput(new Date())}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </Field>
    </Modal>
  );
}
