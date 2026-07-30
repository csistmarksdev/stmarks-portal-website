"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Paginated, PublishStatus } from "@portal/shared";
import { toast } from "sonner";

import { api } from "@/lib/api";

/**
 * Generic admin CRUD hooks over the backend's `/admin/<resource>` endpoints.
 * All admin list endpoints return `Paginated<T>`.
 */

export function useResourceList<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) {
  return useQuery({
    queryKey: [path, params],
    queryFn: () => api.get<Paginated<T>>(path, params),
    /*
     * Keep the current rows on screen while the next search or page loads.
     * Without this every change is a brand-new query key with no cached data,
     * so `isLoading` flips true and the grid collapses into skeletons and back
     * — which reads as jank even when the request itself is fast.
     */
    placeholderData: keepPreviousData,
  });
}

export function useResourceItem<T>(path: string, id?: string) {
  return useQuery({
    queryKey: [path, "item", id],
    queryFn: () => api.get<T>(`${path}/${id}`),
    enabled: Boolean(id),
  });
}

export function useResourceMutations(path: string, label: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [path] });

  const create = useMutation({
    mutationFn: (body: unknown) => api.post<{ id: string }>(path, body),
    onSuccess: () => {
      toast.success(`${label} created`);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.patch<{ id: string }>(`${path}/${id}`, body),
    onSuccess: () => {
      toast.success(`${label} updated`);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`${path}/${id}`),
    onSuccess: () => {
      toast.success(`${label} deleted`);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /**
   * Publishing is optimistic: the badge flips immediately and rolls back if
   * the server refuses. Waiting for a round trip *and* a full list refetch
   * before anything moved made the workflow feel broken on a slow link.
   */
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PublishStatus }) =>
      api.patch(`${path}/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: [path] });
      const snapshot = queryClient.getQueriesData({ queryKey: [path] });

      queryClient.setQueriesData<Paginated<{ id: string; status: PublishStatus }>>(
        { queryKey: [path] },
        (current) =>
          current?.items
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === id ? { ...item, status } : item,
                ),
              }
            : current,
      );

      return { snapshot };
    },
    onError: (error: Error, _variables, context) => {
      // Put back exactly what was on screen before.
      for (const [key, value] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, value);
      }
      toast.error(error.message);
    },
    onSuccess: (_data, variables) => {
      toast.success(`Status set to ${variables.status}`);
    },
    // Reconcile with the server either way.
    onSettled: () => void invalidate(),
  });

  return { create, update, remove, setStatus, invalidate };
}
