import { UserSummary } from '../../users/domain/user';
import { SparepartRequestStatus } from './sparepart-request-status.enum';

export interface SparepartItem {
  id: string;
  name: string;
  qty: number;
}

export interface SparepartRequest {
  id: string;
  workOrderId: string;
  status: SparepartRequestStatus;
  /** Why the mechanic needs the parts (required). */
  requestNote: string;
  requestedById: string;
  /** The SPV who reviewed it: approve or reject. */
  approvedById: string | null;
  /** SPV note: optional on approve, required on reject. */
  approvalNote: string | null;
  items: SparepartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SparepartRequestView extends SparepartRequest {
  requestedBy: UserSummary;
  approvedBy: UserSummary | null;
}

export interface NewSparepartRequest {
  workOrderId: string;
  requestNote: string;
  requestedById: string;
  items: { name: string; qty: number }[];
}
