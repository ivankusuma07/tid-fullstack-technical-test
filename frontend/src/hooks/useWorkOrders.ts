import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { WorkOrderListParams } from '../api/types';
import { usersApi } from '../api/users';
import { workOrdersApi } from '../api/workOrders';
import { useActor } from '../context/ActorContext';

/** Query keys start with 'work-orders' + actor id: invalidating ['work-orders'] refreshes everything. */
export const workOrderKeys = {
  all: ['work-orders'] as const,
  list: (actorId: string | undefined, params: WorkOrderListParams) => ['work-orders', actorId, 'list', params] as const,
  detail: (actorId: string | undefined, id: string) => ['work-orders', actorId, 'detail', id] as const,
};

export function useWorkOrderList(params: WorkOrderListParams) {
  const { actor } = useActor();
  return useQuery({
    queryKey: workOrderKeys.list(actor?.id, params),
    queryFn: () => workOrdersApi.list(params),
    enabled: !!actor,
    placeholderData: keepPreviousData,
  });
}

export function useWorkOrder(id: string | undefined) {
  const { actor } = useActor();
  return useQuery({
    queryKey: workOrderKeys.detail(actor?.id, id ?? ''),
    queryFn: () => workOrdersApi.get(id!),
    enabled: !!actor && !!id,
    retry: false,
  });
}

export function useMechanics() {
  return useQuery({ queryKey: ['users', 'MECHANIC'], queryFn: () => usersApi.list('MECHANIC') });
}
