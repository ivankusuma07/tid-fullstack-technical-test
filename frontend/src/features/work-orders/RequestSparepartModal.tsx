import { useState } from 'react';
import type { SparepartItemInput, WorkOrder } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Textarea } from '../../components/ui';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';

/** Mechanic: "Yes, spareparts are needed" with a required note and one or more items. */
export function RequestSparepartModal({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  const { requestSparepart } = useWorkOrderActions();
  const [note, setNote] = useState('');
  const [items, setItems] = useState<SparepartItemInput[]>([{ name: '', qty: 1 }]);

  const setItem = (i: number, patch: Partial<SparepartItemInput>) =>
    setItems((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <Modal
      title={`Request sparepart: ${workOrder.woNumber}`}
      onClose={onClose}
      submitLabel="Send to SPV"
      submitting={requestSparepart.isPending}
      onSubmit={() =>
        requestSparepart.mutate(
          { id: workOrder.id, note, items: items.map((i) => ({ name: i.name.trim(), qty: i.qty })) },
          { onSuccess: onClose },
        )
      }
    >
      <Field label="Why are these parts needed?" hint="The SPV reads this before approving or rejecting.">
        <Textarea required maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      </Field>

      <div>
        <div className="mb-1 text-sm font-medium text-slate-700">Items</div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                required
                maxLength={100}
                placeholder="Part name"
                aria-label={`Item ${i + 1} name`}
                value={item.name}
                onChange={(e) => setItem(i, { name: e.target.value })}
              />
              <Input
                required
                type="number"
                min={1}
                max={10000}
                aria-label={`Item ${i + 1} quantity`}
                className="w-24! shrink-0"
                value={item.qty}
                onChange={(e) => setItem(i, { qty: Number(e.target.value) })}
              />
              <Button
                variant="ghost"
                aria-label={`Remove item ${i + 1}`}
                disabled={items.length === 1}
                onClick={() => setItems((rows) => rows.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-2" onClick={() => setItems((rows) => [...rows, { name: '', qty: 1 }])}>
          <Plus className="h-3.5 w-3.5" /> Add item
        </Button>
      </div>
    </Modal>
  );
}
