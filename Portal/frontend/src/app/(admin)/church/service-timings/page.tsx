"use client";

import type { LocalizedText, ServiceTiming } from "@portal/shared";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { LocalizedField } from "@/components/admin/localized-field";
import { SingletonShell } from "@/components/admin/singleton-shell";
import { Button } from "@/components/ui/button";
import { useSingleton } from "@/hooks/use-singleton";

const EMPTY: LocalizedText = { en: "", ta: "" };

type TimingDraft = Omit<ServiceTiming, "id"> & { id?: string };

export default function ServiceTimingsPage() {
  const { data, isLoading, save } = useSingleton<ServiceTiming[]>("service-timings");
  const [items, setItems] = useState<TimingDraft[]>([]);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const update = (index: number, patch: Partial<TimingDraft>) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  return (
    <SingletonShell
      title="Service timings"
      description="The weekly services table on the About pages."
      loading={isLoading}
      saving={save.isPending}
      onSave={() => save.mutate({ items })}
    >
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((current) => [
              ...current,
              { day: EMPTY, time: EMPTY, service: EMPTY, venue: EMPTY },
            ])
          }
        >
          <PlusIcon /> Add service
        </Button>
      </div>
      {items.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No services yet.
        </p>
      )}
      {items.map((item, index) => (
        <div key={item.id ?? index} className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Service {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-destructive"
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
            >
              <Trash2Icon />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <LocalizedField label="Day" value={item.day} onChange={(v) => update(index, { day: v })} required />
            <LocalizedField label="Time" value={item.time} onChange={(v) => update(index, { time: v })} required />
          </div>
          <LocalizedField label="Service" value={item.service} onChange={(v) => update(index, { service: v })} required />
          <LocalizedField label="Venue" value={item.venue} onChange={(v) => update(index, { venue: v })} required />
        </div>
      ))}
    </SingletonShell>
  );
}
