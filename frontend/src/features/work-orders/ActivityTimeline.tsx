import { ArrowRight, Package } from 'lucide-react';
import type { ActivityAction, SparepartRequest, WorkOrderActivity } from '../../api/types';
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

interface Props {
  activities: WorkOrderActivity[];
  /** Used to show the requested parts on REQUEST_SPAREPART entries. */
  sparepartRequests: SparepartRequest[];
}

/** Who did what and when, oldest first. Recorded by the backend in the same transaction as each step. */
export function ActivityTimeline({ activities, sparepartRequests }: Props) {
  if (activities.length === 0) return <p className="text-sm text-slate-500">No activity yet.</p>;

  const requestsById = new Map(sparepartRequests.map((r) => [r.id, r]));

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {activities.map((a) => {
        const request = a.action === 'REQUEST_SPAREPART' && a.sparepartRequestId ? requestsById.get(a.sparepartRequestId) : undefined;
        return (
          <li key={a.id} className="relative">
            <span
              className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white ${DOT[a.action] ?? 'bg-slate-400'}`}
            />
            <p className="text-sm text-slate-800">
              <strong>{a.actor.name}</strong> {VERB[a.action]}
            </p>
            {a.fromStatus !== a.toStatus && a.toStatus && (
              <p className="flex items-center gap-1 text-xs text-slate-500">
                {a.fromStatus && (
                  <>
                    {STATUS_LABEL[a.fromStatus]}
                    <ArrowRight aria-label="to" className="h-3 w-3 shrink-0 text-slate-400" />
                  </>
                )}
                {STATUS_LABEL[a.toStatus]}
              </p>
            )}
            {a.note && <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs whitespace-pre-wrap text-slate-700">{a.note}</p>}
            {request && <RequestedItems request={request} />}
            <time className="text-xs text-slate-400" dateTime={a.createdAt}>
              {formatDateTime(a.createdAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

/** The parts and quantities of a sparepart request, as a compact table. */
function RequestedItems({ request }: { request: SparepartRequest }) {
  const totalQty = request.items.reduce((sum, i) => sum + i.qty, 0);
  return (
    <div className="mt-1 overflow-hidden rounded border border-slate-200 text-xs">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600">
        <Package aria-hidden className="h-3.5 w-3.5 text-slate-500" />
        {request.items.length} {request.items.length === 1 ? 'item' : 'items'}, {totalQty} pcs total
      </div>
      <table className="w-full">
        <thead className="sr-only">
          <tr>
            <th>Part</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {request.items.map((item) => (
            <tr key={item.id}>
              <td className="px-2 py-1 text-slate-700">{item.name}</td>
              <td className="px-2 py-1 text-right font-medium whitespace-nowrap text-slate-800 tabular-nums">× {item.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
