"use client";

import { MAX_FEATURED_SERVICES, type LocalizedText, type ServiceTiming } from "@portal/shared";
import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  GripVerticalIcon,
  PinIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LanguageBar } from "@/components/admin/language-toggle";
import { LocalizedField } from "@/components/admin/localized-field";
import { SingletonShell } from "@/components/admin/singleton-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSelect } from "@/components/ui/check-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSingleton } from "@/hooks/use-singleton";
import {
  formatServiceTime,
  formatWeeks,
  normaliseWeeks,
  parseLegacyTime,
  WEEK_OPTIONS,
} from "@/lib/service-time";
import { cn } from "@/lib/utils";

const EMPTY: LocalizedText = { en: "", ta: "" };

/**
 * `key` is client-only: a stable handle for the list and for drag-and-drop,
 * including services added in this session that have no id yet. It is stripped
 * before saving.
 */
type TimingDraft = Omit<ServiceTiming, "id"> & { id?: string; key: string };

const newKey = () => crypto.randomUUID();

/**
 * The days a service can fall on, in both languages - picked from a list, so
 * the English and Tamil always agree and the Website's "Sunday" grouping (it
 * matches `day.en`) never misses a misspelt entry.
 */
const DAYS: LocalizedText[] = [
  { en: "Sunday", ta: "ஞாயிறு" },
  { en: "Monday", ta: "திங்கள்" },
  { en: "Tuesday", ta: "செவ்வாய்" },
  { en: "Wednesday", ta: "புதன்" },
  { en: "Thursday", ta: "வியாழன்" },
  { en: "Friday", ta: "வெள்ளி" },
  { en: "Saturday", ta: "சனி" },
];

/**
 * The clock values of a service. Entries saved before the clock picker carry
 * only typed text ("6:00 AM"); it is read onto the clock here, whenever the
 * card is drawn, so they open with their times set. A new service has
 * `startTime: ""` and starts blank.
 */
function clockOf(item: TimingDraft): { startTime: string; endTime: string } {
  if (item.startTime !== undefined) {
    return { startTime: item.startTime, endTime: item.endTime ?? "" };
  }
  const legacy = parseLegacyTime(item.time?.en);
  return { startTime: legacy.startTime ?? "", endTime: legacy.endTime ?? "" };
}

function toDraft(item: ServiceTiming): TimingDraft {
  return { ...item, key: item.id ?? newKey() };
}

function timeProblem(item: TimingDraft): string | null {
  const { startTime, endTime } = clockOf(item);
  if (!startTime) return "Pick a start time.";
  if (endTime && endTime <= startTime) return "The end time must be after the start.";
  return null;
}

export default function ServiceTimingsPage() {
  const { data, isLoading, save, pending, reject } = useSingleton<ServiceTiming[]>("service-timings");
  const [items, setItems] = useState<TimingDraft[]>([]);

  useEffect(() => {
    if (data) setItems(data.map(toDraft));
  }, [data]);

  const update = (key: string, patch: Partial<TimingDraft>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const move = (index: number, delta: number) => {
    setItems((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const featuredCount = items.filter((item) => item.featured).length;

  const onSave = () => {
    if (featuredCount > MAX_FEATURED_SERVICES) {
      toast.error(`Only ${MAX_FEATURED_SERVICES} services can be featured. Turn one off to save.`);
      return;
    }
    const invalid = items.findIndex((item) => timeProblem(item));
    if (invalid !== -1) {
      toast.error(`Service ${invalid + 1}: ${timeProblem(items[invalid])}`);
      return;
    }
    save.mutate({
      // The list order is the order the Website shows them in.
      items: items.map(({ key: _key, ...item }) => {
        const { startTime, endTime } = clockOf({ ...item, key: _key });
        return {
          ...item,
          startTime,
          endTime: endTime || undefined,
          featured: item.featured || undefined,
          weeks: normaliseWeeks(item.weeks).length ? normaliseWeeks(item.weeks) : undefined,
          time: formatServiceTime(startTime, endTime),
        };
      }),
    });
  };

  return (
    <SingletonShell
      title="Service timings"
      description="The weekly services table on the About pages, and the times in the homepage hero."
      loading={isLoading}
      saving={save.isPending || reject.isPending}
      pending={pending}
      onReject={() => reject.mutateAsync().catch(() => undefined)}
      onSave={onSave}
    >
      <LanguageBar />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <PinIcon className="size-4" />
          {featuredCount > 0
            ? `${featuredCount} of ${MAX_FEATURED_SERVICES} featured in the homepage hero.`
            : `Nothing featured - the homepage hero shows every Sunday service. Up to ${MAX_FEATURED_SERVICES} can be featured.`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((current) => [
              ...current,
              {
                key: newKey(),
                day: EMPTY,
                time: EMPTY,
                startTime: "",
                endTime: "",
                service: EMPTY,
                venue: EMPTY,
              },
            ])
          }
        >
          <PlusIcon /> Add service
        </Button>
      </div>
      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No services yet.
        </p>
      )}
      <Reorder.Group
        as="div"
        axis="y"
        values={items.map((item) => item.key)}
        onReorder={(keys: string[]) =>
          setItems((current) => keys.map((key) => current.find((item) => item.key === key)!))
        }
        className="space-y-4"
      >
        {items.map((item, index) => (
          <TimingCard
            key={item.key}
            item={item}
            index={index}
            count={items.length}
            featureFull={featuredCount >= MAX_FEATURED_SERVICES}
            onChange={(patch) => update(item.key, patch)}
            onMove={(delta) => move(index, delta)}
            onRemove={() => setItems((current) => current.filter((other) => other.key !== item.key))}
          />
        ))}
      </Reorder.Group>
    </SingletonShell>
  );
}

function TimingCard({
  item,
  index,
  count,
  featureFull,
  onChange,
  onMove,
  onRemove,
}: {
  item: TimingDraft;
  index: number;
  count: number;
  /** The featured limit is reached: only a service already on can change. */
  featureFull: boolean;
  onChange: (patch: Partial<TimingDraft>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  // Drags start from the handle only, so selecting text in a field never
  // picks the card up.
  const controls = useDragControls();
  const clock = clockOf(item);
  const problem = clock.startTime || clock.endTime ? timeProblem(item) : null;
  const preview = formatServiceTime(clock.startTime, clock.endTime);
  const weeksPreview = formatWeeks(item.weeks, item.day);
  const id = `timing-${item.key}`;
  // Writes both ends together, so an entry read from typed text keeps its
  // other end once one is changed.
  const setClock = (patch: Partial<typeof clock>) => onChange({ ...clock, ...patch });

  const knownDay = DAYS.some((day) => day.en === item.day.en);
  // At the limit, a service that is off cannot be switched on; one that is on
  // can always be switched off.
  const locked = featureFull && !item.featured;

  return (
    <Reorder.Item
      as="div"
      value={item.key}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "space-y-4 rounded-2xl border bg-background p-4",
        item.featured ? "border-primary/60" : "border-border/70",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Drag to reorder"
            onPointerDown={(event) => controls.start(event)}
            className="-ml-1 flex size-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground">Service {index + 1}</span>
          {item.featured && (
            <Badge variant="secondary" className="gap-1">
              <PinIcon className="size-3" /> Featured
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move up"
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive"
            onClick={onRemove}
            aria-label="Remove service"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      {/* Day, Week and Time share one shape - a label row, then one row of
          boxes - so they line up. One row on a wide screen; Day and Week
          pair up above Time on a narrower one. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor={`${id}-day`}>
              Day<span className="text-destructive"> *</span>
            </Label>
          </div>
          <Select
            id={`${id}-day`}
            aria-label="Day"
            value={item.day.en}
            onChange={(event) => {
              const day = DAYS.find((option) => option.en === event.target.value);
              if (day) onChange({ day: { ...day } });
            }}
          >
            <option value="" disabled>
              Choose a day
            </option>
            {/* An older entry typed as something else ("Daily") stays as it is
                until a day is picked. */}
            {!knownDay && item.day.en && (
              <option value={item.day.en} disabled>
                {item.day.en}
                {item.day.ta ? ` · ${item.day.ta}` : ""}
              </option>
            )}
            {DAYS.map((day) => (
              <option key={day.en} value={day.en}>
                {day.en} · {day.ta}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor={`${id}-weeks`}>Week of the month</Label>
          </div>
          <CheckSelect
            id={`${id}-weeks`}
            label="Week of the month"
            noneLabel="Every week"
            options={WEEK_OPTIONS.map((week) => ({
              value: String(week.value),
              short: week.en,
              label: (
                <span>
                  {week.value === -1 ? "Last" : week.en} {item.day.en || "week"}
                  <span lang="ta" className="ml-1.5 text-muted-foreground">
                    · {week.ta}
                  </span>
                </span>
              ),
            }))}
            value={(item.weeks ?? []).map(String)}
            onChange={(next) => onChange({ weeks: next.map(Number) })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor={`${id}-start`}>
              Time<span className="text-destructive"> *</span>
            </Label>
            <span className="text-xs text-muted-foreground">From – to · end optional</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-start`}
              type="time"
              required
              aria-label="Start time"
              value={clock.startTime}
              onChange={(event) => setClock({ startTime: event.target.value })}
            />
            <span aria-hidden className="shrink-0 text-muted-foreground">
              –
            </span>
            <Input
              id={`${id}-end`}
              type="time"
              aria-label="End time (optional)"
              value={clock.endTime}
              min={clock.startTime || undefined}
              onChange={(event) => setClock({ endTime: event.target.value })}
              aria-invalid={!!problem && !!clock.endTime}
            />
          </div>
          {problem && <p className="text-xs text-destructive">{problem}</p>}
        </div>
      </div>
      {/* What the website will print, in both languages. */}
      {!problem && preview.en && (
        <p className="-mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <ClockIcon className="size-3.5" />
          <span>{[weeksPreview.en || item.day.en, preview.en].filter(Boolean).join(" · ")}</span>
          <span aria-hidden>|</span>
          <span lang="ta">{[weeksPreview.ta || item.day.ta, preview.ta].filter(Boolean).join(" · ")}</span>
        </p>
      )}
      <LocalizedField label="Service" value={item.service} onChange={(v) => onChange({ service: v })} required />
      <LocalizedField label="Venue" value={item.venue} onChange={(v) => onChange({ venue: v })} required />

      <label
        htmlFor={`${id}-featured`}
        className={cn(
          "flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-3.5 py-3",
          locked ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span className="space-y-0.5">
          <span className={cn("block text-sm font-medium", locked && "text-muted-foreground")}>
            Feature in the homepage hero
          </span>
          <span className="block text-xs text-muted-foreground">
            {locked
              ? `${MAX_FEATURED_SERVICES} services are already featured. Turn one off to feature this one.`
              : "Pins this service in the opening scene of the homepage."}
          </span>
        </span>
        <Switch
          id={`${id}-featured`}
          checked={!!item.featured}
          disabled={locked}
          onCheckedChange={(checked) => onChange({ featured: checked })}
        />
      </label>
    </Reorder.Item>
  );
}
