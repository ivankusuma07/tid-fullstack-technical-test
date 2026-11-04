import type { SparepartItem, SparepartRequest } from '../../api/types';
import { RequestStatusBadge } from '../../components/StatusBadge';
import { formatDateTime } from '../../lib/datetime';

export function SparepartItemsTable({ items }: { items: SparepartItem[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
          <th className="py-1.5 font-medium">Part</th>
          <th className="w-20 py-1.5 text-right font-medium">Qty</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-slate-100 last:border-0">
            <td className="py-1.5 text-slate-800">{item.name}</td>
            <td className="py-1.5 text-right text-slate-800">{item.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Full request history, newest first. Rejected requests stay visible with the SPV's reason. */
export function SparepartRequestList({ requests }: { requests: SparepartRequest[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-slate-500">No sparepart requests.</p>;
  }

  return (
    <ul className="space-y-4">
      {requests.map((r) => (
        <li key={r.id} className="rounded-lg border border-slate-200 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              Requested by <strong className="text-slate-800">{r.requestedBy.name}</strong> · {formatDateTime(r.createdAt)}
            </div>
            <RequestStatusBadge status={r.status} />
          </div>
          <p className="mb-3 text-sm whitespace-pre-wrap text-slate-800">{r.requestNote}</p>
          <SparepartItemsTable items={r.items} />
          {r.approvedBy && (
            <div
              className={`mt-3 rounded-md p-3 text-sm ${r.status === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}
            >
              <div className="font-medium">
                {r.status === 'REJECTED' ? 'Rejected' : 'Approved'} by {r.approvedBy.name} · {formatDateTime(r.updatedAt)}
              </div>
              {r.approvalNote && <p className="mt-1 whitespace-pre-wrap">{r.approvalNote}</p>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
