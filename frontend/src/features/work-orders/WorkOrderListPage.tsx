import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { WorkOrderStatus } from '../../api/types';
import { Pagination } from '../../components/Pagination';
import { STATUS_LABEL, StatusBadge } from '../../components/StatusBadge';
import { Button, Icon, Input, Select, Spinner } from '../../components/ui';
import { useActor } from '../../context/ActorContext';
import { useWorkOrderList } from '../../hooks/useWorkOrders';
import { formatDateTime } from '../../lib/datetime';
import { ActionBar } from './ActionBar';
import { WorkOrderFormModal } from './WorkOrderFormModal';

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const COLUMNS = ['No', 'Fleet Number', 'WO Number', 'Title', 'Breakdown Time', 'Start Date', 'End Date', 'Status', 'Mechanic', 'Actions'];

export function WorkOrderListPage() {
  const { actor } = useActor();
  const navigate = useNavigate();
  const isMechanic = actor?.role === 'MECHANIC';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<WorkOrderStatus | ''>('');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounced(search);

  // Back to page 1 whenever the filter (or the actor) changes.
  useEffect(() => setPage(1), [debouncedSearch, status, scope, limit, actor?.id]);
  // Each mechanic starts on "Assigned to me".
  useEffect(() => setScope('mine'), [actor?.id]);

  const { data, isLoading, isFetching, error } = useWorkOrderList({
    search: debouncedSearch || undefined,
    status: status || undefined,
    scope: isMechanic ? scope : undefined,
    page,
    limit,
  });

  const emptyMessage =
    isMechanic && scope === 'mine' && !debouncedSearch && !status
      ? 'No work orders assigned to you yet.'
      : 'No work orders match the filters.';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search title, WO number, fleet number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value as WorkOrderStatus | '')} className="max-w-48" aria-label="Status filter">
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as WorkOrderStatus[])
            .filter((s) => !(isMechanic && s === 'DRAFT'))
            .map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
        </Select>
        {isMechanic && (
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm" role="radiogroup" aria-label="Scope">
            {(['mine', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={scope === s}
                onClick={() => setScope(s)}
                className={`rounded-md px-3 py-1 font-medium ${scope === s ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}
              >
                {s === 'mine' ? 'Assigned to me' : 'All'}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto">
          {actor?.role === 'ADMIN' && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Icon name="plus" /> Add New Work Order
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="bg-emerald-50 text-left text-xs text-slate-600">
              {COLUMNS.map((c) => (
                <th key={c} className="px-3 py-3 font-semibold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isFetching && !isLoading ? 'opacity-60' : ''}>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <Spinner />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-red-600">
                  {(error as Error).message}
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data?.items.map((wo, i) => (
                <tr key={wo.id} className="border-t border-slate-100 align-middle hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-500">{(page - 1) * limit + i + 1}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap text-slate-800">{wo.fleetNumber}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link to={`/work-orders/${wo.id}`} className="text-emerald-700 hover:underline">
                      {wo.woNumber}
                    </Link>
                  </td>
                  <td className="max-w-56 truncate px-3 py-2.5 text-slate-800" title={wo.title}>
                    {wo.title}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatDateTime(wo.breakdownTime)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatDateTime(wo.startDate)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatDateTime(wo.endDate)}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={wo.status} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{wo.assignedMechanic?.name ?? '-'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/work-orders/${wo.id}`}
                        aria-label={`View ${wo.woNumber}`}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                      >
                        <Icon name="eye" className="h-3.5 w-3.5" />
                      </Link>
                      <ActionBar workOrder={wo} size="sm" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination page={page} limit={limit} total={data.total} onPageChange={setPage} onLimitChange={setLimit} />
      )}

      {creating && (
        <WorkOrderFormModal onClose={() => setCreating(false)} onCreated={(wo) => navigate(`/work-orders/${wo.id}`)} />
      )}
    </section>
  );
}
