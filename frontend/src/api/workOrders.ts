import { api, toQueryString } from './client';
import type {
  Page,
  SparepartItemInput,
  WorkOrder,
  WorkOrderDetail,
  WorkOrderFormValues,
  WorkOrderListParams,
} from './types';

export const workOrdersApi = {
  list: (params: WorkOrderListParams) => api<Page<WorkOrder>>('GET', `/work-orders${toQueryString(params)}`),
  get: (id: string) => api<WorkOrderDetail>('GET', `/work-orders/${id}`),

  create: (body: WorkOrderFormValues) => api<WorkOrderDetail>('POST', '/work-orders', body),
  editDraft: (id: string, body: Partial<WorkOrderFormValues>) => api<WorkOrderDetail>('PATCH', `/work-orders/${id}`, body),
  deleteDraft: (id: string) => api<void>('DELETE', `/work-orders/${id}`),

  submit: (id: string) => api<WorkOrderDetail>('POST', `/work-orders/${id}/submit`),
  assign: (id: string, mechanicId: string) => api<WorkOrderDetail>('POST', `/work-orders/${id}/assign`, { mechanicId }),
  update: (id: string, body: { title?: string; description?: string }) =>
    api<WorkOrderDetail>('POST', `/work-orders/${id}/update`, body),
  requestSparepart: (id: string, body: { note: string; items: SparepartItemInput[] }) =>
    api<WorkOrderDetail>('POST', `/work-orders/${id}/request-sparepart`, body),
  start: (id: string) => api<WorkOrderDetail>('POST', `/work-orders/${id}/start`),
  addNote: (id: string, note: string) => api<WorkOrderDetail>('POST', `/work-orders/${id}/notes`, { note }),
  complete: (id: string, endDate: string) => api<WorkOrderDetail>('POST', `/work-orders/${id}/complete`, { endDate }),

  approveSparepart: (requestId: string, note?: string) =>
    api<WorkOrderDetail>('POST', `/sparepart-requests/${requestId}/approve`, note ? { note } : {}),
  rejectSparepart: (requestId: string, note: string) =>
    api<WorkOrderDetail>('POST', `/sparepart-requests/${requestId}/reject`, { note }),
};
