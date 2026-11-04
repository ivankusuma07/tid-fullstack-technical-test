import { NewSparepartRequest, SparepartRequest } from './sparepart-request';

export const SPAREPART_REQUEST_REPOSITORY = Symbol('SPAREPART_REQUEST_REPOSITORY');

export interface SparepartRequestRepository {
  /** Creates the request and its items together. */
  create(data: NewSparepartRequest): Promise<SparepartRequest>;
  /** `lock: true` takes a row lock (SELECT ... FOR UPDATE) when called inside a transaction. */
  findById(id: string, options?: { lock?: boolean }): Promise<SparepartRequest | null>;
  findPendingByWorkOrder(workOrderId: string): Promise<SparepartRequest | null>;
  /** Persists status / review fields. Items are immutable after creation. */
  save(request: SparepartRequest): Promise<SparepartRequest>;
}
