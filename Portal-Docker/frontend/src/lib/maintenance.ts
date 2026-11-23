"use client";

import { useQuery } from "@tanstack/react-query";
import type { SiteMaintenanceAdmin } from "@portal/shared";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const MAINTENANCE_KEY = ["site", "maintenance"] as const;

/** The maintenance switch — read by the Portal-wide banner and its own page. */
export function useMaintenance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: MAINTENANCE_KEY,
    queryFn: () => api.get<SiteMaintenanceAdmin>("/admin/site/maintenance"),
    enabled: !!user,
    refetchInterval: 60_000,
  });
}
