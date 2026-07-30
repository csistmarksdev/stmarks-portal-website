"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

/**
 * Church singleton documents (§5.8/§5.10) — GET/PUT /admin/church/<key>.
 * A 404 means the singleton hasn't been seeded yet; treated as "empty".
 */
export function useSingleton<T>(key: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["church", key],
    queryFn: async () => {
      try {
        return await api.get<T>(`/admin/church/${key}`);
      } catch (error) {
        if ((error as { status?: number }).status === 404) return null;
        throw error;
      }
    },
  });

  const save = useMutation({
    mutationFn: (data: unknown) => api.put<T>(`/admin/church/${key}`, data),
    onSuccess: () => {
      toast.success("Saved");
      void queryClient.invalidateQueries({ queryKey: ["church", key] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { ...query, save };
}
