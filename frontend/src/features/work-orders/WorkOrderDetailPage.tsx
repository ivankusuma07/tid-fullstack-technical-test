import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowLeft } from 'lucide-react';
import { Card, Spinner } from '../../components/ui';
import { useWorkOrder } from '../../hooks/useWorkOrders';
import { formatDateTime } from '../../lib/datetime';
import { ActionBar } from './ActionBar';
import { ActivityTimeline } from './ActivityTimeline';
import { SparepartRequestList } from './SparepartRequestList';
import { NEXT_STEP } from './workflow';
import { WorkflowStepper } from './WorkflowStepper';

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: wo, isLoading, error } = useWorkOrder(id);

  const back = (
    <Link to="/work-orders" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-700">
      <ArrowLeft className="h-4 w-4" /> Back to list
    </Link>
  );

  if (isLoading) return <Spinner />;
  if (error || !wo) {
    return (
      <div>
        {back}
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          {(error as Error)?.message ?? 'Work order not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-800">{wo.woNumber}</h2>
            <StatusBadge status={wo.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{NEXT_STEP[wo.status]}</p>
        </div>
        <ActionBar workOrder={wo} onDeleted={() => navigate('/work-orders')} />
      </div>

      <Card>
        <WorkflowStepper workOrder={wo} />
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Work order">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Title">{wo.title}</Info>
              <Info label="Vehicle">
                <span className="font-medium">{wo.vehicle.fleetNumber}</span>
                <span className="block text-xs text-slate-500">{wo.vehicle.name}</span>
              </Info>
              <Info label="Breakdown time">{formatDateTime(wo.breakdownTime)}</Info>
              <Info label="Mechanic">{wo.assignedMechanic?.name ?? '-'}</Info>
              <Info label="Start date">{formatDateTime(wo.startDate)}</Info>
              <Info label="End date">{formatDateTime(wo.endDate)}</Info>
              <Info label="Created by">{wo.createdBy.name}</Info>
              <Info label="Created at">{formatDateTime(wo.createdAt)}</Info>
              <Info label="Last updated">{formatDateTime(wo.updatedAt)}</Info>
              <div className="sm:col-span-2 lg:col-span-3">
                <Info label="Description">
                  <span className="whitespace-pre-wrap">{wo.description || '-'}</span>
                </Info>
              </div>
            </dl>
          </Card>
    
      <Card title="Sparepart requests">
        <SparepartRequestList requests={wo.sparepartRequests} />
      </Card>
        </div>

        <Card title="Activity">
          <ActivityTimeline activities={wo.activities} />
        </Card>
      </div>
    </div>
  );
}
