"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  type LocalizedText,
  type SiteMaintenanceAdmin,
} from "@portal/shared";
import { ConstructionIcon, GlobeIcon, InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { LocalizedField } from "@/components/admin/localized-field";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { MAINTENANCE_KEY, useMaintenance } from "@/lib/maintenance";
import { cn, formatDateTime, toDatetimeLocal } from "@/lib/utils";

/**
 * Maintenance mode (church request, 23 Nov 2026). Super-admin only - the
 * page is gated on `site.maintenance`, which only the super admin holds.
 *
 * The Portal stores the switch and serves it at `GET /site/status`; the
 * maintenance gate in front of the website (deploy-ec2/maintenance-gate)
 * reads it and shows the notice instead of the site - the website itself is
 * unchanged.
 */
export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useMaintenance();

  const [message, setMessage] = useState<LocalizedText>(DEFAULT_MAINTENANCE_MESSAGE);
  const [until, setUntil] = useState("");

  useEffect(() => {
    if (!data) return;
    setMessage(data.message);
    setUntil(toDatetimeLocal(data.until));
  }, [data]);

  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      api.put<SiteMaintenanceAdmin>("/admin/site/maintenance", {
        enabled,
        message,
        until: until ? new Date(until).toISOString() : null,
      }),
    onSuccess: (result, enabled) => {
      toast.success(
        enabled === data?.enabled
          ? "Maintenance notice saved"
          : enabled
            ? "Maintenance mode is on"
            : "Maintenance mode is off. The website is live",
      );
      queryClient.setQueryData(MAINTENANCE_KEY, result);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const enabled = data?.enabled ?? false;

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Website"
        title="Maintenance mode"
        description="Take the public website offline behind a short notice (for an upgrade, a move, or a problem that needs fixing) and bring it back."
        actions={
          <Button variant="outline" onClick={() => save.mutate(enabled)} disabled={save.isPending || isLoading}>
            Save notice
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-3xl" />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">What visitors see</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <LocalizedField
                label="Notice"
                value={message}
                onChange={setMessage}
                multiline
                required
              />
              <div className="space-y-1.5">
                <Label>Expected back (optional)</Label>
                <Input
                  type="datetime-local"
                  className="sm:max-w-xs"
                  value={until}
                  onChange={(event) => setUntil(event.target.value)}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Shown with the notice so visitors know when to come back. It does not switch
                  maintenance off by itself.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-2xl",
                    enabled ? "bg-accent-fg/15 text-accent-fg" : "bg-success-soft text-success",
                  )}
                >
                  {enabled ? <ConstructionIcon className="size-5" /> : <GlobeIcon className="size-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {enabled ? "Maintenance mode is on" : "The website is live"}
                  </p>
                  {data?.updatedAt && (
                    <p className="text-xs text-muted-foreground">
                      {data.updatedBy?.name ? `${data.updatedBy.name}, ` : ""}
                      {formatDateTime(data.updatedAt)}
                    </p>
                  )}
                </div>
              </div>

              {enabled ? (
                <Button className="w-full" onClick={() => save.mutate(false)} disabled={save.isPending}>
                  <GlobeIcon /> Bring the website back
                </Button>
              ) : (
                <ConfirmDialog
                  title="Put the website into maintenance mode?"
                  description="Visitors will see the maintenance notice instead of the website until you switch it off. The Portal keeps working as normal."
                  confirmLabel="Turn on maintenance"
                  onConfirm={() => save.mutateAsync(true).then(() => undefined)}
                  trigger={
                    <Button variant="destructive" className="w-full" disabled={save.isPending}>
                      <ConstructionIcon /> Turn on maintenance mode
                    </Button>
                  }
                />
              )}

              <p className="flex items-start gap-2 rounded-2xl bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Visitors see the notice within a few seconds of switching it on, through the
                maintenance gate in front of the website. If the Portal itself is ever down, the
                website stays open.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
