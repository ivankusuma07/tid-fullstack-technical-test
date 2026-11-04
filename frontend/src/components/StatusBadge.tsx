import type { SparepartRequestStatus, WorkOrderStatus } from '../api/types';

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  UPDATED: 'Updated',
  WAITING_SPAREPART: 'Waiting Sparepart',
  READY_TO_WORK: 'Ready to Work',
  WORKING: 'On Progress',
  COMPLETED: 'Completed',
};

const STATUS_STYLE: Record<WorkOrderStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-300',
  SUBMITTED: 'bg-red-50 text-red-700 border-red-300',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-300',
  UPDATED: 'bg-violet-50 text-violet-700 border-violet-300',
  WAITING_SPAREPART: 'bg-orange-50 text-orange-700 border-orange-300',
  READY_TO_WORK: 'bg-cyan-50 text-cyan-700 border-cyan-300',
  WORKING: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

const REQUEST_STYLE: Record<SparepartRequestStatus, string> = {
  PENDING: 'bg-orange-50 text-orange-700 border-orange-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-300',
};

const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap';

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return <span className={`${base} ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function RequestStatusBadge({ status }: { status: SparepartRequestStatus }) {
  return <span className={`${base} ${REQUEST_STYLE[status]}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}
