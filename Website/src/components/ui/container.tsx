import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      sm: "max-w-3xl",
      md: "max-w-5xl",
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      full: "max-w-none",
    },
    padded: {
      true: "px-5 sm:px-8 lg:px-12",
      false: "",
    },
  },
  defaultVariants: {
    size: "xl",
    padded: true,
  },
});

export interface ContainerProps
  extends ComponentProps<"div">,
    VariantProps<typeof containerVariants> {
  as?: ElementType;
}

/** Horizontal layout wrapper. Every section's content sits inside one. */
export function Container({
  className,
  size,
  padded,
  as: Comp = "div",
  ...props
}: ContainerProps) {
  return (
    <Comp
      className={cn(containerVariants({ size, padded }), className)}
      {...props}
    />
  );
}
