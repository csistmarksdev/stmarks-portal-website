import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // No `whitespace-nowrap`: Tamil CTAs ("எங்களுடன் ஆராதியுங்கள்") are long enough
  // that pinning them to one line pushes the label past the button, which the
  // mobile menu then clips. Sizes below use `min-h` so a wrapped label grows the
  // button instead of spilling out of it.
  "inline-flex items-center justify-center gap-2 text-center rounded-full font-medium transition-all duration-300 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // A top-down wash plus a 1px inner highlight gives the fill a light
        // source, so the button reads as a raised key rather than a flat
        // rounded rectangle. The shadow is tinted with the brand ink so it
        // sits as shade on parchment, not grey haze.
        primary:
          "bg-gradient-to-b from-brand-600 to-brand-700 text-[var(--primary-foreground)] shadow-[0_1px_2px_oklch(0.257_0.105_3/0.35),inset_0_1px_0_oklch(1_0_0/0.16)] hover:from-brand-700 hover:to-brand-800 hover:shadow-[0_6px_18px_oklch(0.257_0.105_3/0.28),inset_0_1px_0_oklch(1_0_0/0.16)] active:scale-[0.98]",
        secondary:
          "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-[inset_0_1px_0_oklch(1_0_0/0.7)] hover:border-brand-300 hover:bg-sand-50 hover:shadow-sm active:scale-[0.98]",
        accent:
          "bg-gradient-to-b from-accent-500 to-accent-600 text-white shadow-[0_1px_2px_oklch(0.352_0.106_31/0.35),inset_0_1px_0_oklch(1_0_0/0.22)] hover:from-accent-600 hover:to-accent-700 hover:shadow-[0_6px_18px_oklch(0.352_0.106_31/0.3),inset_0_1px_0_oklch(1_0_0/0.22)] active:scale-[0.98]",
        ghost:
          "text-[var(--foreground)] hover:bg-sand-100 active:scale-[0.98]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
        /* For placement over dark imagery, e.g. the cinematic hero. */
        onDark:
          "bg-white/10 text-white border border-white/25 backdrop-blur-md hover:bg-white/20 active:scale-[0.98]",
      },
      size: {
        sm: "min-h-9 px-4 py-1.5 text-sm",
        md: "min-h-11 px-6 py-2 text-sm",
        lg: "min-h-13 px-8 py-2.5 text-base",
        icon: "size-10 shrink-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a `Link`) instead of a `<button>`. */
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
