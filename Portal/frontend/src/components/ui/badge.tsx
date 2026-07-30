import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        // Soft chips: a translucent wash of the status colour over whatever
        // surface they sit on, so they read correctly in either theme without
        // needing a `dark:` variant each.
        default: "bg-secondary text-secondary-foreground",
        secondary: "bg-muted text-foreground ring-1 ring-border/80",
        success: "bg-success-soft text-success",
        warning: "bg-accent-fg/15 text-accent-fg",
        muted: "bg-muted text-muted-foreground",
        destructive: "bg-destructive/15 text-destructive",
        outline: "ring-1 ring-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
