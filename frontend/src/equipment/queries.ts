import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type EquipmentInput } from '../api';

export const equipmentKeys = {
  lists: ['equipment', 'list'] as const,
  list: (page: number) => ['equipment', 'list', page] as const,
  histories: (id: string) => ['equipment', id, 'history'] as const,
  history: (id: string, page: number) =>
    ['equipment', id, 'history', page] as const,
};

export function useEquipment(page: number) {
  return useQuery({
    queryKey: equipmentKeys.list(page),
    queryFn: ({ signal }) => api.list(page, signal),
  });
}

export function useHistory(id: string | null, page: number) {
  return useQuery({
    queryKey: equipmentKeys.history(id ?? '', page),
    queryFn: ({ signal }) => api.history(id!, page, signal),
    enabled: id !== null,
  });
}

export function useEquipmentMutations() {
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: (data: EquipmentInput) => api.create(data),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EquipmentInput }) =>
      api.update(id, data),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.remove(id) });
  const maintain = useMutation({
    mutationFn: (id: string) => api.maintain(id),
  });
  async function refresh(page: number, id?: string) {
    await client.invalidateQueries({
      queryKey: equipmentKeys.lists,
      refetchType: 'none',
    });
    if (id)
      await client.invalidateQueries({
        queryKey: equipmentKeys.histories(id),
        refetchType: 'none',
      });
    await client.fetchQuery({
      queryKey: equipmentKeys.list(page),
      queryFn: ({ signal }) => api.list(page, signal),
      staleTime: 0,
    });
  }
  return { create, update, remove, maintain, refresh };
}
