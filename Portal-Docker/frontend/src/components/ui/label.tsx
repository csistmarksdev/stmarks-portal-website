"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        // Block, so its box is exactly one 14px line wherever it sits. Inline, it
        // borrowed the parent's 24px line box — labels in plain blocks rode
        // several pixels lower than labels in flex rows, and side-by-side
        // fields never lined up.
        "block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
