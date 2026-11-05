import { MessageSquare, SendHorizontal } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ActivityAction, WorkOrderActivity } from '../../api/types';
import { STATUS_LABEL } from '../../components/StatusBadge';
import { Button, Textarea } from '../../components/ui';
import { useWorkOrderActions } from '../../hooks/useWorkOrderActions';
import { formatDateTime } from '../../lib/datetime';

const VERB: Record<ActivityAction, string> = {
  CREATE: 'created the work order',
  EDIT: 'edited the draft',
  DELETE: 'deleted the draft',
  SUBMIT: 'submitted the work order',
  ASSIGN: 'assigned a mechanic',
  UPDATE: 'updated the work order (lanjutan)',
  REQUEST_SPAREPART: 'requested spareparts',
  APPROVE_SPAREPART: 'approved the sparepart request',
  REJECT_SPAREPART: 'rejected the sparepart request',
  START: 'started working',
  COMPLETE: 'completed the work order',
  NOTE: 'added a note',
};

const DOT: Partial<Record<ActivityAction, string>> = {
  REJECT_SPAREPART: 'bg-red-500',
  APPROVE_SPAREPART: 'bg-emerald-500',
  COMPLETE: 'bg-emerald-600',
  NOTE: 'bg-sky-500',
};

/** Same limit as the backend (MAX_NOTE_LENGTH). */
const MAX_NOTE = 1000;

/**
 * Who did what and when, oldest first, plus notes anyone involved can add. Workflow steps are
 * recorded by the backend in the same transaction as each step.
 */
export function ActivityTimeline({ workOrderId, activities }: { workOrderId: string; activities: WorkOrderActivity[] }) {
  return (
    <div className="space-y-5">
      {activities.length === 0 ? (
        <p className="text-sm text-slate-500">No activity yet.</p>
      ) : (
        <ol className="relative space-y-5 border-l border-slate-200 pl-5">
          {activities.map((a) => (
            <li key={a.id} className="relative">
              <span
                className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white ${DOT[a.action] ?? 'bg-slate-400'}`}
              />
              <p className="text-sm text-slate-800">
                <strong>{a.actor.name}</strong> {VERB[a.action]}
              </p>
              {a.fromStatus !== a.toStatus && a.toStatus && (
                <p className="text-xs text-slate-500">
                  {a.fromStatus ? `${STATUS_LABEL[a.fromStatus]} → ` : ''}
                  {STATUS_LABEL[a.toStatus]}
                </p>
              )}
              {a.note &&
                (a.action === 'NOTE' ? (
                  <p className="mt-1 flex gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-sm whitespace-pre-wrap text-slate-800">
                    <MessageSquare aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                    <span className="min-w-0 break-words">{a.note}</span>
                  </p>
                ) : (
                  <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs whitespace-pre-wrap text-slate-700">{a.note}</p>
                ))}
              <time className="text-xs text-slate-400" dateTime={a.createdAt}>
                {formatDateTime(a.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
      <AddNoteForm workOrderId={workOrderId} />
    </div>
  );
}

/** Ctrl/Cmd + Enter posts; the note shows up for everyone who can see the work order. */
function AddNoteForm({ workOrderId }: { workOrderId: string }) {
  const { addNote } = useWorkOrderActions();
  const [note, setNote] = useState('');
  const trimmed = note.trim();
  const canSend = trimmed.length > 0 && note.length <= MAX_NOTE && !addNote.isPending;

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    addNote.mutate({ id: workOrderId, note: trimmed }, { onSuccess: () => setNote('') });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
  };

  return (
    <form onSubmit={send} className="border-t border-slate-100 pt-4">
      <label htmlFor="activity-note" className="mb-1 block text-sm font-medium text-slate-700">
        Add a note
      </label>
      <Textarea
        id="activity-note"
        rows={2}
        maxLength={MAX_NOTE}
        placeholder="Visible to everyone on this work order"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          Ctrl+Enter to send{note.length > MAX_NOTE * 0.8 && ` · ${note.length}/${MAX_NOTE}`}
        </span>
        <Button type="submit" size="sm" variant="primary" disabled={!canSend}>
          <SendHorizontal className="h-3.5 w-3.5" /> {addNote.isPending ? 'Posting…' : 'Post note'}
        </Button>
      </div>
    </form>
  );
}
