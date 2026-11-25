"use client";

import { CalendarIcon, ClockIcon } from "lucide-react";
import * as React from "react";

import { PickerPanel, type PickerKind } from "@/components/ui/picker-panel";
import { PHONE_QUERY } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const BASE =
  "flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-1 text-sm shadow-sm max-lg:h-11 max-lg:text-base transition-colors duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const PICKERS = new Set(["date", "time", "datetime-local", "month", "week"]);

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type && PICKERS.has(type)) return <PickerInput type={type} className={className} {...props} />;
  return <input type={type} className={cn(BASE, className)} {...props} />;
}

const SHEET_TITLES: Record<PickerKind, string> = {
  date: "Choose a date",
  time: "Choose a time",
  "datetime-local": "Choose a date and time",
};

/** Sets a React-controlled input's value so its `onChange` fires as if typed. */
function setNativeValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Date and time fields.
 *
 * The browser's own picker icon sits wherever the value text ends - right
 * after "--:--", mid-field - and its pop-up is the operating system's, white
 * over the dark theme. Both are replaced: our icon sits at the field's right
 * edge, and a click anywhere on the field opens `PickerPanel`, a card in the
 * same style as the Portal's menus. Typing into the field still works.
 *
 * On a phone the same panel opens as a bottom sheet, the way an app asks for
 * a date or time, and the field is read-only there so tapping it does not
 * also raise the phone's own picker.
 *
 * `className` is for layout (width, `sm:max-w-xs`) and lands on the wrapper.
 */
function PickerInput({
  className,
  type,
  ref,
  onClick,
  onKeyDown,
  disabled,
  ...props
}: React.ComponentProps<"input">) {
  const inner = React.useRef<HTMLInputElement>(null);
  const wrapper = React.useRef<HTMLDivElement>(null);
  const [panel, setPanel] = React.useState<null | "below" | "above" | "sheet">(null);
  const popover = React.useRef<HTMLDivElement>(null);
  const [shift, setShift] = React.useState(0);
  const phone = useMediaQuery(PHONE_QUERY);
  // Re-renders the open panel after a pick, uncontrolled fields included.
  const [, refresh] = React.useReducer((n: number) => n + 1, 0);
  const Icon = type === "time" ? ClockIcon : CalendarIcon;
  const ours = type === "date" || type === "time" || type === "datetime-local";

  const setRef = (node: HTMLInputElement | null) => {
    inner.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const open = () => {
    if (disabled) return;
    if (ours && phone) {
      setPanel("sheet");
      return;
    }
    if (ours) {
      const box = wrapper.current?.getBoundingClientRect();
      setPanel(box && window.innerHeight - box.bottom < 360 && box.top > 360 ? "above" : "below");
      return;
    }
    try {
      inner.current?.showPicker();
    } catch {
      // Not supported, or not from a user gesture - the field still takes typing.
    }
  };

  // The panel opens at the field's left edge; in a narrow column near the
  // right of the window (an event's "Starts") a date-and-time panel is wider
  // than the field and would run off screen. Shift it left just enough to stay
  // 12px inside the window, never past its left edge.
  React.useLayoutEffect(() => {
    if (!panel || panel === "sheet" || !popover.current) {
      setShift(0);
      return;
    }
    const box = popover.current.getBoundingClientRect();
    const over = box.right - (window.innerWidth - 12);
    setShift(over > 0 ? -Math.min(over, Math.max(0, box.left - 12)) : 0);
  }, [panel]);

  React.useEffect(() => {
    if (!panel || panel === "sheet") return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setPanel(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [panel]);

  return (
    <div ref={wrapper} className={cn("relative w-full min-w-0", className)}>
      {panel === "sheet" && (
        <Sheet open onOpenChange={(next) => !next && setPanel(null)}>
          <SheetContent>
            <div className="px-5 pb-5 pt-1">
              <SheetTitle className="mb-3 text-base font-semibold">
                {props["aria-label"] ?? SHEET_TITLES[type as PickerKind]}
              </SheetTitle>
              <SheetDescription className="sr-only">{SHEET_TITLES[type as PickerKind]}</SheetDescription>
              <PickerPanel
                kind={type as PickerKind}
                layout="sheet"
                value={inner.current?.value ?? ""}
                min={typeof props.min === "string" ? props.min : undefined}
                max={typeof props.max === "string" ? props.max : undefined}
                onPick={(next) => {
                  if (!inner.current) return;
                  setNativeValue(inner.current, next);
                  refresh();
                }}
                onDone={() => setPanel(null)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
      {panel && panel !== "sheet" && (
        <div
          ref={popover}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className={cn(
            "absolute left-0 z-50 rounded-2xl bg-card p-3 text-card-foreground ring-1 ring-border/70 [box-shadow:var(--shadow-card-hover)]",
            panel === "below" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          )}
        >
          <PickerPanel
            kind={type as PickerKind}
            value={inner.current?.value ?? ""}
            min={typeof props.min === "string" ? props.min : undefined}
            max={typeof props.max === "string" ? props.max : undefined}
            onPick={(next) => {
              if (!inner.current) return;
              setNativeValue(inner.current, next);
              refresh();
            }}
            onDone={() => setPanel(null)}
          />
        </div>
      )}
      <input
        ref={setRef}
        type={type}
        disabled={disabled}
        readOnly={(ours && phone) || props.readOnly}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && !panel) open();
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === "ArrowDown" && event.altKey) {
            event.preventDefault();
            open();
          }
        }}
        className={cn(
          BASE,
          // `min-w-0`: Chrome otherwise keeps a date input at its natural
          // width and pushes narrow layouts wider than the screen.
          "min-w-0 cursor-pointer pr-10 tabular-nums [color-scheme:light] dark:[color-scheme:dark]",
          "[&::-webkit-calendar-picker-indicator]:hidden",
          // Chromium pads the edit fields unevenly; keep the value flush left.
          "[&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0",
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onClick={() => (panel ? setPanel(null) : open())}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon className="size-4" />
      </button>
    </div>
  );
}

export { Input };
