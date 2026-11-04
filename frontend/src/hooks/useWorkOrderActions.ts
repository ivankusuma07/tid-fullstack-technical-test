import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SparepartItemInput, WorkOrderFormValues } from '../api/types';
import { workOrdersApi } from '../api/workOrders';
import { useToast } from '../context/ToastContext';
import { workOrderKeys } from './useWorkOrders';

/**
 * One mutation per workflow step. Each shows a toast and invalidates all work order
 * queries, so list, detail and availableActions refresh from the server.
 */
function useAction<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, success: string | ((r: TResult) => string)) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      toast.success(typeof success === 'function' ? success(result) : success);
      return qc.invalidateQueries({ queryKey: workOrderKeys.all });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useWorkOrderActions() {
  return {
    create: useAction((v: WorkOrderFormValues) => workOrdersApi.create(v), (wo) => `${wo.woNumber} created`),
    editDraft: useAction(
      ({ id, values }: { id: string; values: Partial<WorkOrderFormValues> }) => workOrdersApi.editDraft(id, values),
      'Draft saved',
    ),
    deleteDraft: useAction(({ id }: { id: string; woNumber: string }) => workOrdersApi.deleteDraft(id), 'Work order deleted'),
    submit: useAction((id: string) => workOrdersApi.submit(id), 'Work order submitted'),
    assign: useAction(
      ({ id, mechanicId }: { id: string; mechanicId: string }) => workOrdersApi.assign(id, mechanicId),
      (wo) => `Assigned to ${wo.assignedMechanic?.name}`,
    ),
    update: useAction(
      ({ id, title, description }: { id: string; title?: string; description?: string }) =>
        workOrdersApi.update(id, { title, description }),
      'Work order updated',
    ),
    requestSparepart: useAction(
      ({ id, note, items }: { id: string; note: string; items: SparepartItemInput[] }) =>
        workOrdersApi.requestSparepart(id, { note, items }),
      'Sparepart request sent to SPV',
    ),
    approveSparepart: useAction(
      ({ requestId, note }: { requestId: string; note?: string }) => workOrdersApi.approveSparepart(requestId, note),
      'Sparepart request approved',
    ),
    rejectSparepart: useAction(
      ({ requestId, note }: { requestId: string; note: string }) => workOrdersApi.rejectSparepart(requestId, note),
      'Sparepart request rejected',
    ),
    start: useAction((id: string) => workOrdersApi.start(id), 'Work started'),
    complete: useAction(
      ({ id, endDate }: { id: string; endDate: string }) => workOrdersApi.complete(id, endDate),
      'Work order completed',
    ),
  };
}
