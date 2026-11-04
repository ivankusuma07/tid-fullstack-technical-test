import { UserSummary } from '../../users/domain/user';
import { VehicleSummary } from '../../vehicles/domain/vehicle';
import { SparepartRequestView } from '../../sparepart-requests/domain/sparepart-request';
import { WorkOrderStatus } from './work-order-status.enum';
import { WorkOrderActivityView } from './work-order-activity';

export interface WorkOrder {
  id: string;
  /** Human-friendly number, e.g. WO-20261104-0001. */
  woNumber: string;
  title: string;
  description: string | null;
  /** The vehicle (fleet unit) this work order is for. */
  vehicleId: string;
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

/** A work order with its vehicle and users resolved (list rows). */
export interface WorkOrderView extends WorkOrder {
  vehicle: VehicleSummary;
  createdBy: UserSummary;
  assignedMechanic: UserSummary | null;
}

/** Detail page: also includes the sparepart request history (newest first) and the timeline (oldest first). */
export interface WorkOrderDetail extends WorkOrderView {
  sparepartRequests: SparepartRequestView[];
  activities: WorkOrderActivityView[];
}

export interface NewWorkOrder {
  woNumber: string;
  title: string;
  description: string | null;
  vehicleId: string;
  breakdownTime: Date;
  status: WorkOrderStatus;
  createdById: string;
}

