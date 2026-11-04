import { UserSummary } from '../../users/domain/user';
import { SparepartRequestView } from '../../sparepart-requests/domain/sparepart-request';
import { WorkOrderStatus } from './work-order-status.enum';

export interface WorkOrder {
  id: string;
  /** Human-friendly number, e.g. WO-20261104-0001. */
  woNumber: string;
  title: string;
  description: string | null;
  /** Vehicle identifier, normalized to upper case (e.g. DT-0035). */
  fleetNumber: string;
  /** When the vehicle broke down / was reported. */
  breakdownTime: Date;
  status: WorkOrderStatus;
  createdById: string;
  assignedMechanicId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A work order with its related users resolved (list rows). */
export interface WorkOrderView extends WorkOrder {
  createdBy: UserSummary;
  assignedMechanic: UserSummary | null;
}

/** Detail page: also includes the full sparepart request history, newest first. */
export interface WorkOrderDetail extends WorkOrderView {
  sparepartRequests: SparepartRequestView[];
}

export interface NewWorkOrder {
  woNumber: string;
  title: string;
  description: string | null;
  fleetNumber: string;
  breakdownTime: Date;
  status: WorkOrderStatus;
  createdById: string;
}

/** Trims and upper-cases a fleet number so "dt-0035 " and "DT-0035" are the same vehicle. */
export function normalizeFleetNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}
