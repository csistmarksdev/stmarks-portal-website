"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

/**
 * Bottom sheet — the mobile idiom for secondary navigation and actions.
 * Rounded top corners, a grab handle, and safe-area padding so the content
 * clears the home indicator.
 */
function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-overlay fixed inset-0 z-50 bg-sand-950/50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "animate-sheet pb-safe fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card [box-shadow:var(--shadow-float)]",
          className,
        )}
        {...props}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-card pb-1 pt-3">
          <span aria-hidden className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

const SheetTitle = DialogPrimitive.Title;
const SheetDescription = DialogPrimitive.Description;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
