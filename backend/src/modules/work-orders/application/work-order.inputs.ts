import { WorkOrderStatus } from '../domain/work-order-status.enum';

/** Plain use-case inputs (HTTP DTOs live in presentation/ and are mapped to these). */

export interface CreateWorkOrderInput {
  title: string;
  description?: string | null;
  vehicleId: string;
  breakdownTime: Date;
}

export interface EditDraftInput {
  title?: string;
  description?: string | null;
  vehicleId?: string;
  breakdownTime?: Date;
}

export interface UpdateWorkOrderInput {
  title?: string;
  description?: string | null;
}

export interface ListWorkOrdersInput {
  status?: WorkOrderStatus;
  search?: string;
  page?: number;
  limit?: number;
}
