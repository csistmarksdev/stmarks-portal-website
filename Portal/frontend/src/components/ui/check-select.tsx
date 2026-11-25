"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { PHONE_QUERY } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * A dropdown of checkboxes - pick any number of options.
 *
 * Styled as `Select`: a field-shaped trigger, a card list on desktop that stays
 * open while you tick, and a bottom sheet with a Done button on a phone. The
 * first row, `noneLabel`, stands for "nothing picked" (e.g. "Every week") and
 * clears the others when chosen.
 */

export type CheckOption = { value: string; label: React.ReactNode; short?: string };

const TRIGGER =
  "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 py-1 text-left text-sm shadow-sm max-lg:h-11 max-lg:text-base transition-colors duration-300 hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[1.125rem] shrink-0 items-center justify-center rounded-md border transition-colors",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card",
      )}
    >
      {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

export function CheckSelect({
  id,
  label,
  options,
  value,
  onChange,
  noneLabel,
  disabled,
  className,
}: {
  id?: string;
  /** The field's name: the trigger's accessible name and the sheet's title. */
  label: string;
  options: CheckOption[];
  value: string[];
  onChange: (next: string[]) => void;
  noneLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const phone = useMediaQuery(PHONE_QUERY);
  const [open, setOpen] = React.useState(false);

  // Kept in the options' order, whatever order they were ticked in.
  const toggle = (option: string) => {
    const next = value.includes(option) ? value.filter((v) => v !== option) : [...value, option];
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)));
  };

  const summary =
    value.length === 0
      ? noneLabel
      : options
          .filter((option) => value.includes(option.value))
          .map((option) => option.short ?? option.label)
          .join(", ");

  const trigger = (
    <>
      <span className="min-w-0 truncate">{summary}</span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </>
  );

  if (phone) {
    const row = (checked: boolean, text: React.ReactNode, onClick: () => void, key: string) => (
      <button
        key={key}
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        onClick={onClick}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base transition-colors active:bg-secondary",
          checked && "font-semibold",
        )}
      >
        <Box checked={checked} />
        <span className="min-w-0">{text}</span>
      </button>
    );
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger id={id} disabled={disabled} aria-label={label} className={cn(TRIGGER, className)}>
          {trigger}
        </SheetTrigger>
        <SheetContent>
          <div className="px-5 pb-2 pt-1">
            <SheetTitle className="text-base font-semibold">{label}</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">Tick all that apply.</SheetDescription>
          </div>
          <div role="menu" aria-label={label} className="px-3">
            {row(value.length === 0, noneLabel, () => onChange([]), "none")}
            <div aria-hidden className="mx-2 my-1.5 h-px bg-border/80" />
            {options.map((option) =>
              row(value.includes(option.value), option.label, () => toggle(option.value), option.value),
            )}
          </div>
          <div className="px-5 pb-4 pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity active:opacity-90"
            >
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const item =
    "relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm outline-none transition-colors duration-200 focus:bg-secondary focus:text-secondary-foreground";

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuPrimitive.Trigger
        id={id}
        disabled={disabled}
        aria-label={label}
        className={cn(TRIGGER, className)}
      >
        {trigger}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[max(var(--radix-dropdown-menu-trigger-width),11rem)] overflow-hidden rounded-2xl bg-card p-1.5 text-card-foreground ring-1 ring-border/70 [box-shadow:var(--shadow-card-hover)]"
        >
          <DropdownMenuPrimitive.CheckboxItem
            checked={value.length === 0}
            // Stays open: ticking several is the point.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onChange([])}
            className={item}
          >
            <Box checked={value.length === 0} />
            {noneLabel}
          </DropdownMenuPrimitive.CheckboxItem>
          <DropdownMenuPrimitive.Separator className="-mx-1.5 my-1 h-px bg-border/80" />
          {options.map((option) => (
            <DropdownMenuPrimitive.CheckboxItem
              key={option.value}
              checked={value.includes(option.value)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => toggle(option.value)}
              className={item}
            >
              <Box checked={value.includes(option.value)} />
              {option.label}
            </DropdownMenuPrimitive.CheckboxItem>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
