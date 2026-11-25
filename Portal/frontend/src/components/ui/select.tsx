"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/** Below the `lg` breakpoint - the Portal's phone layout. */
export const PHONE_QUERY = "(max-width: 63.999rem)";

/**
 * Select, drawn in the Portal's own style.
 *
 * It was a native `<select>`, whose open list is the operating system's - a
 * white Windows menu over the dark theme. It is now a Radix select whose list
 * matches the dropdown menus (`dropdown-menu.tsx`): a card with rounded items.
 *
 * The props stay the native ones, so every page is unchanged: write `<option>`
 * and `<optgroup>` children, and read `event.target.value` in `onChange`.
 */

type Item = { value: string; label: React.ReactNode; disabled?: boolean };
type Group = { label?: string; items: Item[] };

/** Radix reserves "" for "no value"; the native "" option rides on this. */
const EMPTY = "__select-empty__";
const toRadix = (value: string) => (value === "" ? EMPTY : value);
const fromRadix = (value: string) => (value === EMPTY ? "" : value);

type OptionProps = { value?: string | number; disabled?: boolean; children?: React.ReactNode };
type GroupProps = { label?: string; children?: React.ReactNode };

/** Reads `<option>`s (inside fragments, arrays and `<optgroup>`s) into groups. */
function readOptions(children: React.ReactNode): Group[] {
  const groups: Group[] = [{ items: [] }];
  const visit = (nodes: React.ReactNode, into: Item[]) => {
    React.Children.forEach(nodes, (node) => {
      if (!React.isValidElement(node)) return;
      if (node.type === React.Fragment) {
        visit((node.props as { children?: React.ReactNode }).children, into);
      } else if (node.type === "optgroup") {
        const props = node.props as GroupProps;
        const group: Group = { label: props.label, items: [] };
        groups.push(group);
        visit(props.children, group.items);
      } else if (node.type === "option") {
        const props = node.props as OptionProps;
        into.push({
          value: String(props.value ?? ""),
          label: props.children,
          disabled: props.disabled,
        });
      }
    });
  };
  visit(children, groups[0].items);
  return groups.filter((group) => group.items.length > 0);
}

type SelectProps = Omit<React.ComponentProps<"select">, "value" | "defaultValue"> & {
  value?: string | number;
  defaultValue?: string | number;
};

function Select({
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  name,
  id,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const groups = readOptions(children);
  const phone = useMediaQuery(PHONE_QUERY);

  const change = (next: string) => {
    const target = { value: fromRadix(next), name } as HTMLSelectElement;
    onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
  };

  if (phone) {
    return (
      <SheetSelect
        groups={groups}
        value={value === undefined ? undefined : String(value)}
        defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
        onPick={(next) => change(toRadix(next))}
        disabled={disabled}
        id={id}
        ariaLabel={ariaLabel}
        ariaLabelledBy={ariaLabelledBy}
        className={className}
      />
    );
  }

  return (
    <SelectPrimitive.Root
      value={value === undefined ? undefined : toRadix(String(value))}
      defaultValue={defaultValue === undefined ? undefined : toRadix(String(defaultValue))}
      onValueChange={change}
      disabled={disabled}
      required={required}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 py-1 text-left text-sm shadow-sm max-lg:h-11 max-lg:text-base transition-colors duration-300 hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground",
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[max(var(--radix-select-trigger-width),11rem)] overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-border/70 [box-shadow:var(--shadow-card-hover)]"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronUpIcon className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5">
            {groups.map((group, index) => (
              <SelectPrimitive.Group key={group.label ?? `group-${index}`}>
                {index > 0 && <div aria-hidden className="-mx-1.5 my-1 h-px bg-border/80" />}
                {group.label && (
                  <SelectPrimitive.Label className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </SelectPrimitive.Label>
                )}
                {group.items.map((item) => (
                  <SelectPrimitive.Item
                    key={item.value}
                    value={toRadix(item.value)}
                    disabled={item.disabled}
                    className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pl-2.5 pr-8 text-sm outline-none transition-colors duration-200 focus:bg-secondary focus:text-secondary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
                      <CheckIcon className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronDownIcon className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/**
 * The phone form: the list opens as a bottom sheet, the way an app asks you to
 * choose - big rows for a thumb, the choice ticked, the field's name on top.
 */
function SheetSelect({
  groups,
  value,
  defaultValue,
  onPick,
  disabled,
  id,
  ariaLabel,
  ariaLabelledBy,
  className,
}: {
  groups: Group[];
  value?: string;
  defaultValue?: string;
  onPick: (next: string) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [own, setOwn] = React.useState(defaultValue ?? "");
  const [title, setTitle] = React.useState("Choose an option");
  const trigger = React.useRef<HTMLButtonElement>(null);
  const current = value ?? own;
  const selected = groups.flatMap((group) => group.items).find((item) => item.value === current);

  // The sheet is titled with the field's name: its aria-label, or the label
  // written above it (`<Label>` then `<Select>` in one block, as every form
  // here does).
  const nameOfField = () => {
    if (ariaLabel) return ariaLabel;
    const block = trigger.current?.parentElement;
    const text = block?.querySelector("label")?.textContent?.replace(/\*\s*$/, "").trim();
    return text || "Choose an option";
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setTitle(nameOfField());
        setOpen(next);
      }}
    >
      <SheetTrigger
        ref={trigger}
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 py-1 text-left text-base shadow-sm transition-colors duration-300 hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          (!selected || selected.disabled) && "text-muted-foreground",
          className,
        )}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </SheetTrigger>
      <SheetContent>
        <div className="px-5 pb-2 pt-1">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <SheetDescription className="sr-only">Choose one</SheetDescription>
        </div>
        <div role="listbox" aria-label={title} className="px-3 pb-4">
          {groups.map((group, index) => (
            <div key={group.label ?? `group-${index}`} role="group" aria-label={group.label}>
              {index > 0 && <div aria-hidden className="mx-2 my-1.5 h-px bg-border/80" />}
              {group.label && (
                <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">{group.label}</p>
              )}
              {group.items.map((item) => {
                const isSelected = item.value === current;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={item.disabled}
                    onClick={() => {
                      if (value === undefined) setOwn(item.value);
                      onPick(item.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-base transition-colors active:bg-secondary disabled:opacity-40",
                      isSelected && "bg-secondary font-semibold text-secondary-foreground",
                    )}
                  >
                    <span className="min-w-0">{item.label}</span>
                    {isSelected && <CheckIcon className="size-5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { Select };
