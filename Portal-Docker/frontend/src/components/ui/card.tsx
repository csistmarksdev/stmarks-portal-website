import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card surface, matching the Website: rounded-3xl, hairline ring, top-down
 * wash so the surface has a light source, layered warm shadow.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-gradient-to-b from-card to-card-wash text-card-foreground ring-1 ring-border/70 [box-shadow:var(--shadow-card)] transition-card",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("font-[family-name:var(--font-display)] text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  // Full padding on its own; tucked up under a header when one precedes it.
  // It was always `pt-0`, which left header-less cards with their first field
  // pressed against the top edge.
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 [[data-slot=card-header]+&]:pt-0", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
