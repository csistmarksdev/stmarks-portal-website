"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

/** A change to a church page submitted by someone who cannot publish. */
export interface SingletonSubmission<T> {
  data: T;
  submittedBy: { userId: string; name: string };
  submittedAt: string;
}

/**
 * Church singleton documents (§5.8/§5.10) — GET/PUT /admin/church/<key>.
 * A 404 means the singleton hasn't been seeded yet; treated as "empty".
 *
 * Approval rule: a save by someone who can publish goes live; anyone else's
 * is held as a submission. While one is waiting, the form shows *it* rather
 * than the live version — the writer keeps working on their change, and the
 * approver reviews exactly what was submitted.
 */
export function useSingleton<T>(key: string) {
  const queryClient = useQueryClient();

  const live = useQuery({
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

  const waiting = useQuery({
    queryKey: ["church", key, "pending"],
    queryFn: () =>
      api.get<{ pending: SingletonSubmission<T> | null }>(`/admin/church/${key}/pending`),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["church", key] });

  const save = useMutation({
    mutationFn: (data: unknown) =>
      api.put<{ status: "published" | "pending" }>(`/admin/church/${key}`, data),
    onSuccess: (result) => {
      toast.success(
        result?.status === "pending"
          ? "Submitted — an admin will review it before it goes on the website"
          : "Saved — live on the website",
      );
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reject = useMutation({
    mutationFn: () => api.post(`/admin/church/${key}/reject`),
    onSuccess: () => {
      toast.success("Change rejected — the website keeps the current version");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pending = waiting.data?.pending ?? null;
  return {
    ...live,
    /** What the form edits: the waiting submission if there is one. */
    data: pending ? pending.data : live.data,
    isLoading: live.isLoading || waiting.isLoading,
    pending,
    save,
    reject,
  };
}
