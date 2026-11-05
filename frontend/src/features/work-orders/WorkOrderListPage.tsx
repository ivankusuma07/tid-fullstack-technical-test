import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { WorkOrderStatus } from '../../api/types';
import { Pagination } from '../../components/Pagination';
import { STATUS_LABEL, StatusBadge } from '../../components/StatusBadge';
import { Eye, ListFilter, Plus, Search } from 'lucide-react';
import { Button, Input, Select, Spinner } from '../../components/ui';
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounced(search);

  // Back to page 1 whenever the filter (or the actor) changes.
  useEffect(() => setPage(1), [debouncedSearch, status, limit, actor?.id]);

  const { data, isLoading, isFetching, error } = useWorkOrderList({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    limit,
  });

  const emptyMessage =
    isMechanic && !debouncedSearch && !status
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
          icon={Search}
          className="w-full max-w-xs"
          aria-label="Search"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value as WorkOrderStatus | '')} icon={ListFilter} className="w-48" aria-label="Status filter">
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as WorkOrderStatus[])
            // A mechanic's work orders are always assigned, so draft / submitted never apply.
            .filter((s) => !(isMechanic && (s === 'DRAFT' || s === 'SUBMITTED')))
            .map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
        </Select>
        {isMechanic && <span className="text-sm text-slate-500">Showing work orders assigned to you</span>}
        <div className="ml-auto">
          {actor?.role === 'ADMIN' && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Add New Work Order
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
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap text-slate-800" title={wo.vehicle.name}>
                    {wo.vehicle.fleetNumber}
                  </td>
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
                        <Eye className="h-3.5 w-3.5" />
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
