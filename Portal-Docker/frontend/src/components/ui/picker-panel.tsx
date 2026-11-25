"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The open pop-up of a date, time or date-and-time field, in the Portal's own
 * card style - the browser's pickers are drawn by the operating system and
 * ignore the theme. Values are the native input's: "HH:mm", "YYYY-MM-DD" and
 * "YYYY-MM-DDTHH:mm".
 */

export type PickerKind = "date" | "time" | "datetime-local";

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function splitValue(kind: PickerKind, value: string) {
  if (kind === "time") return { date: "", time: value };
  if (kind === "date") return { date: value, time: "" };
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

export function PickerPanel({
  kind,
  layout = "popover",
  value,
  min,
  max,
  onPick,
  onDone,
}: {
  kind: PickerKind;
  /** "sheet" fills a phone's bottom sheet: stacked, wide, bigger targets. */
  layout?: "popover" | "sheet";
  value: string;
  min?: string;
  max?: string;
  onPick: (next: string) => void;
  onDone: () => void;
}) {
  const { date, time } = splitValue(kind, value);

  const pickDate = (next: string) => {
    if (kind === "date") {
      onPick(next);
      onDone();
    } else onPick(`${next}T${time || "09:00"}`);
  };
  const pickTime = (next: string) => {
    if (kind === "time") onPick(next);
    else onPick(`${date || todayIso()}T${next}`);
  };

  const sheet = layout === "sheet";

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("flex gap-3", sheet && "flex-col items-stretch gap-4")}>
        {kind !== "time" && (
          <Calendar
            value={date}
            min={min?.slice(0, 10)}
            max={max?.slice(0, 10)}
            onPick={pickDate}
            wide={sheet}
          />
        )}
        {kind !== "date" && <TimeColumns value={time} onPick={pickTime} wide={sheet} />}
      </div>
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-t border-border/70 pt-2.5",
          // In a phone dialog the actions stay pinned at the foot while the
          // calendar and the clock scroll above them.
          sheet && "sticky bottom-0 z-10 bg-card pb-2 [&_button]:min-h-11 [&_button]:px-4 [&_button]:text-sm",
        )}
      >
        <button
          type="button"
          onClick={() => {
            onPick("");
            onDone();
          }}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Clear
        </button>
        <div className="flex gap-1">
          {kind !== "time" && (
            <button
              type="button"
              onClick={() => pickDate(todayIso())}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Today
            </button>
          )}
          {kind !== "date" && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* --------------------------------- Calendar -------------------------------- */

function Calendar({
  value,
  min,
  max,
  onPick,
  wide = false,
}: {
  value: string;
  min?: string;
  max?: string;
  onPick: (next: string) => void;
  wide?: boolean;
}) {
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso();
  const [view, setView] = React.useState(() => ({
    year: Number(initial.slice(0, 4)),
    month: Number(initial.slice(5, 7)) - 1,
  }));
  const today = todayIso();

  const first = new Date(view.year, view.month, 1).getDay();
  const days = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  const step = (delta: number) =>
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div className={wide ? "w-full" : "w-[16.5rem]"}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => step(-1)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <p className="text-sm font-semibold">
          {MONTHS[view.month]} {view.year}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => step(1)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-1 text-[0.6875rem] font-medium text-muted-foreground">
            {day}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const iso = `${view.year}-${pad(view.month + 1)}-${pad(day)}`;
          const selected = iso === value;
          const outOfRange = (min && iso < min) || (max && iso > max);
          return (
            <button
              key={iso}
              type="button"
              disabled={!!outOfRange}
              onClick={() => onPick(iso)}
              className={cn(
                wide ? "flex aspect-square w-full max-h-12 items-center justify-center rounded-xl text-base" : "flex size-9 items-center justify-center rounded-lg text-sm",
                "tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-30",
                selected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "hover:bg-secondary",
                !selected && iso === today && "font-semibold text-primary ring-1 ring-inset ring-primary/40",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- Time columns ------------------------------ */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

function TimeColumns({
  value,
  onPick,
  wide = false,
}: {
  value: string;
  onPick: (next: string) => void;
  wide?: boolean;
}) {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  const hour24 = match ? Number(match[1]) : null;
  const minute = match ? Number(match[2]) : null;
  const pm = hour24 !== null && hour24 >= 12;
  const hour12 = hour24 === null ? null : hour24 % 12 === 0 ? 12 : hour24 % 12;

  // Five-minute steps, plus an odd minute already on the field.
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  if (minute !== null && !minutes.includes(minute)) {
    minutes.push(minute);
    minutes.sort((a, b) => a - b);
  }

  const compose = (h12: number, min: number, isPm: boolean) =>
    `${pad((h12 % 12) + (isPm ? 12 : 0))}:${pad(min)}`;

  return (
    <div className={cn("flex gap-1", wide && "gap-2")}>
      <Column
        wide={wide}
        label="Hour"
        options={HOURS.map((h) => ({ key: h, text: String(h) }))}
        selected={hour12}
        onPick={(h) => onPick(compose(h, minute ?? 0, pm))}
      />
      <Column
        wide={wide}
        label="Minute"
        options={minutes.map((m) => ({ key: m, text: pad(m) }))}
        selected={minute}
        onPick={(m) => onPick(compose(hour12 ?? 9, m, pm))}
      />
      <Column
        wide={wide}
        label="AM or PM"
        options={[
          { key: 0, text: "AM" },
          { key: 1, text: "PM" },
        ]}
        selected={hour24 === null ? null : pm ? 1 : 0}
        onPick={(p) => onPick(compose(hour12 ?? 9, minute ?? 0, p === 1))}
      />
    </div>
  );
}

function Column({
  label,
  options,
  selected,
  onPick,
  wide = false,
}: {
  wide?: boolean;
  label: string;
  options: { key: number; text: string }[];
  selected: number | null;
  onPick: (key: number) => void;
}) {
  const list = React.useRef<HTMLDivElement>(null);

  // Opens with the chosen value in view.
  React.useEffect(() => {
    const active = list.current?.querySelector<HTMLElement>("[aria-selected='true']");
    if (active && list.current) {
      list.current.scrollTop = active.offsetTop - list.current.clientHeight / 2 + active.clientHeight / 2;
    }
  }, [selected]);

  return (
    <div
      ref={list}
      role="listbox"
      aria-label={label}
      className={cn(
        "flex flex-col gap-0.5 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        wide ? "h-44 flex-1" : "h-[15.5rem] w-14",
      )}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="option"
          aria-selected={option.key === selected}
          onClick={() => onPick(option.key)}
          className={cn(
            "shrink-0 rounded-lg tabular-nums transition-colors",
            wide ? "min-h-11 text-base" : "py-1.5 text-sm",
            option.key === selected
              ? "bg-primary font-semibold text-primary-foreground"
              : "hover:bg-secondary",
          )}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}
