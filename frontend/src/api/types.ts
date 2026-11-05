export type Role = 'ADMIN' | 'SPV' | 'MECHANIC';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'UPDATED'
  | 'WAITING_SPAREPART'
  | 'READY_TO_WORK'
  | 'WORKING'
  | 'COMPLETED';

/** Computed by the backend policy for the current actor; the UI only renders these. */
export type WorkOrderAction =
  | 'EDIT'
  | 'DELETE'
  | 'SUBMIT'
  | 'ASSIGN'
  | 'UPDATE'
  | 'REQUEST_SPAREPART'
  | 'APPROVE_SPAREPART'
  | 'REJECT_SPAREPART'
  | 'START'
  | 'COMPLETE';

export type SparepartRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Vehicle {
  id: string;
  fleetNumber: string;
  name: string;
}

export interface UserSummary {
  id: string;
  name: string;
  role: Role;
}

/** All dates are ISO 8601 strings (UTC) as returned by the API. */
export interface WorkOrder {
  id: string;
  woNumber: string;
  title: string;
  description: string | null;
  vehicle: Vehicle;
  breakdownTime: string;
  status: WorkOrderStatus;
  createdBy: UserSummary;
  assignedMechanic: UserSummary | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  availableActions: WorkOrderAction[];
}

export interface SparepartItem {
  id: string;
  name: string;
  qty: number;
}

export interface SparepartRequest {
  id: string;
  workOrderId: string;
  status: SparepartRequestStatus;
  requestNote: string;
  requestedBy: UserSummary;
  approvedBy: UserSummary | null;
  approvalNote: string | null;
  items: SparepartItem[];
  createdAt: string;
  updatedAt: string;
}

export type ActivityAction = WorkOrderAction | 'CREATE' | 'NOTE';

export interface WorkOrderActivity {
  id: string;
  action: ActivityAction;
  fromStatus: WorkOrderStatus | null;
  toStatus: WorkOrderStatus | null;
  note: string | null;
  actor: UserSummary;
  createdAt: string;
}

export interface WorkOrderDetail extends WorkOrder {
  /** Newest first. */
  sparepartRequests: SparepartRequest[];
  /** Oldest first. */
  activities: WorkOrderActivity[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkOrderListParams {
  status?: WorkOrderStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkOrderFormValues {
  title: string;
  description?: string;
  vehicleId: string;
  breakdownTime: string;
}

export interface SparepartItemInput {
  name: string;
  qty: number;
}
