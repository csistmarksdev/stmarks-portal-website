"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The phone form of every picker - dropdowns, checkbox lists, dates and
 * times: a centred dialog, the way a phone app asks you to choose. The field's
 * name on top, the choices in a scrolling body, the actions along the foot.
 *
 * Deliberately not `DialogContent`, which becomes a bottom sheet on a phone:
 * a choice is a short, focused question, and a centred card with the page
 * dimmed behind it is what an app shows for one.
 */
export function ChoiceDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Read out to screen readers; shown only when `showDescription`. */
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-overlay fixed inset-0 z-50 bg-sand-950/60 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[min(85dvh,40rem)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-card text-card-foreground ring-1 ring-border/70 [box-shadow:var(--shadow-float)] focus:outline-none",
            className,
          )}
        >
          <div className="shrink-0 px-5 pb-3 pt-5">
            <DialogPrimitive.Title className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className={description ? "mt-1 text-sm text-muted-foreground" : "sr-only"}>
              {description ?? title}
            </DialogPrimitive.Description>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">{children}</div>
          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** A text button for a dialog's foot - "Cancel", "Clear", "Done". */
export function ChoiceAction({
  primary = false,
  className,
  ...props
}: React.ComponentProps<"button"> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors",
        primary
          ? "bg-primary text-primary-foreground active:opacity-90"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
