import type { ActivityAction, WorkOrderActivity } from '../../api/types';
import { STATUS_LABEL } from '../../components/StatusBadge';
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
};

const DOT: Partial<Record<ActivityAction, string>> = {
  REJECT_SPAREPART: 'bg-red-500',
  APPROVE_SPAREPART: 'bg-emerald-500',
  COMPLETE: 'bg-emerald-600',
};

/** Who did what and when, oldest first. Recorded by the backend in the same transaction as each step. */
export function ActivityTimeline({ activities }: { activities: WorkOrderActivity[] }) {
  if (activities.length === 0) return <p className="text-sm text-slate-500">No activity yet.</p>;

  return (
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
          {a.note && <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs whitespace-pre-wrap text-slate-700">{a.note}</p>}
          <time className="text-xs text-slate-400" dateTime={a.createdAt}>
            {formatDateTime(a.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
