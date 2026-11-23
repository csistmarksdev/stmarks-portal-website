"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A textarea that grows with what is typed into it, so the writer always sees
 * the whole of their text — no clipped titles, no scrolling inside a three-line
 * slot.
 *
 * `singleLine` makes it behave like a text input that wraps: Enter does not add
 * a line break (pasted ones become spaces), but a long title — and Tamil runs
 * long — wraps onto a second line instead of disappearing past the edge of the
 * box.
 */
function AutoTextarea({
  className,
  singleLine = false,
  minRows,
  stretch = false,
  value,
  onChange,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"textarea">, "rows"> & {
  singleLine?: boolean;
  /** Height floor while empty or short. Defaults to 1 for single-line, 3 otherwise. */
  minRows?: number;
  /**
   * Fit the content as a *minimum* and otherwise fill the parent's height —
   * used side by side, so the shorter language matches the taller one. The
   * parent must give it the room (a flex column with this as `flex-1`).
   */
  stretch?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const rows = minRows ?? (singleLine ? 1 : 3);

  const resize = React.useCallback(() => {
    const element = ref.current;
    if (!element) return;
    // Collapse first so the box can shrink when text is deleted. In stretch
    // mode the flex growth is suspended too, or the measurement would include
    // the space borrowed from the taller neighbour.
    element.style.minHeight = "0px";
    element.style.height = "auto";
    if (stretch) element.style.flexGrow = "0";
    const borders = element.offsetHeight - element.clientHeight;
    const fit = `${element.scrollHeight + borders}px`;
    if (stretch) {
      element.style.flexGrow = "";
      element.style.height = "";
      element.style.minHeight = fit;
    } else {
      element.style.minHeight = "";
      element.style.height = fit;
    }
  }, [stretch]);

  // Before paint, so a long value never flashes at the minimum height.
  React.useLayoutEffect(resize, [value, resize]);

  // Re-measure when the width changes: a narrower column wraps more lines.
  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      // Our own height changes trigger this too; only width matters.
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      resize();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [resize]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onKeyDown={(event) => {
        // Not mid-composition: Tamil keyboards confirm a syllable with Enter.
        if (singleLine && event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
        }
        onKeyDown?.(event);
      }}
      onChange={(event) => {
        if (singleLine && /[\r\n]/.test(event.target.value)) {
          event.target.value = event.target.value.replace(/\s*[\r\n]+\s*/g, " ");
        }
        onChange?.(event);
      }}
      className={cn(
        "flex w-full resize-none overflow-hidden rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors duration-300 placeholder:text-muted-foreground hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        // Single-line matches the 40px Input exactly while it fits on one line.
        singleLine ? "min-h-10 py-[9px] leading-5" : "py-2.5 leading-relaxed",
        stretch && "flex-1",
        className,
      )}
      {...props}
    />
  );
}

export { AutoTextarea };
