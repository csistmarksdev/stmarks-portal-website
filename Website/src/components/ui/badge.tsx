import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-brand-50 text-brand-800 border border-brand-100",
        accent: "bg-accent-50 text-accent-800 border border-accent-200",
        muted:
          "bg-[var(--surface-muted)] text-[var(--muted-foreground)] border border-[var(--border)]",
        outline: "border border-[var(--border)] text-[var(--foreground)]",
        onDark: "bg-white/15 text-white border border-white/25 backdrop-blur-sm",
      },
      size: {
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

export interface BadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}
