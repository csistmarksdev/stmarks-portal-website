import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Buttons.
 *
 * The capsule shape is the site's own and is kept, through
 * `--radius-control`. What went is the finish: a top-down gradient wash, an
 * inner highlight and a coloured glow that bloomed under the button on hover -
 * three effects stacked to imitate a lit plastic key. A solid brand fill that
 * deepens on hover says the same thing in one move, and lets the label carry
 * the invitation, which on a church page is what the reader is actually
 * responding to.
 */
const buttonVariants = cva(
  // No `whitespace-nowrap`: Tamil CTAs ("எங்களுடன் ஆராதியுங்கள்") are long enough
  // that pinning them to one line pushes the label past the button, which the
  // mobile menu then clips. Sizes below use `min-h` so a wrapped label grows the
  // button instead of spilling out of it.
  // The capsule is the site's own and is kept: `--radius-control`, the sizes
  // below and the geometry are all untouched. What the variants add is only
  // light - a raised control at rest, a slightly higher one on hover, and a
  // compressed one under the finger.
  //
  // `translate` and `scale` are named alongside `transform`: Tailwind v4 writes
  // `active:scale-[0.98]` and `hover:-translate-y-px` to those standalone
  // properties, and a transition list that mentions only `transform` was easing
  // neither - the press had been snapping since the utility was written.
  //
  // 180ms rather than 300ms on the press. A control that takes a third of a
  // second to acknowledge a finger does not feel physical, it feels laggy; the
  // release can afford to be slower than the press, which is what the two
  // durations here are for.
  "inline-flex items-center justify-center gap-2.5 rounded-[var(--radius-control)] text-center font-medium transition-[background-color,border-color,color,box-shadow,transform,translate,scale] duration-300 ease-[var(--ease-out-expo)] active:duration-[180ms] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-[var(--ease-out-expo)] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* Filled controls stand proud of the page and press into it. */
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--elevation-control)] hover:-translate-y-px hover:bg-brand-800 hover:shadow-[var(--elevation-control-hover)] active:translate-y-0 active:shadow-[var(--elevation-control-pressed)]",
        accent:
          "bg-accent-700 text-white shadow-[var(--elevation-control)] hover:-translate-y-px hover:bg-accent-800 hover:shadow-[var(--elevation-control-hover)] active:translate-y-0 active:shadow-[var(--elevation-control-pressed)]",
        /* An outline control sits *on* the parchment rather than above it, so
           it gets the quiet elevation: a real white top edge and almost no
           shade. It still presses. */
        secondary:
          "border border-sand-300 bg-transparent text-[var(--foreground)] shadow-[var(--elevation-control-quiet)] hover:border-sand-400 hover:bg-sand-100 hover:shadow-[var(--elevation-control-hover)] active:shadow-[var(--elevation-control-pressed)]",
        /* A ghost has no surface until it is reached for; it earns one on
           hover and presses like the rest. */
        ghost:
          "text-[var(--foreground)] hover:bg-sand-100 hover:shadow-[var(--elevation-control-quiet)] active:shadow-[var(--elevation-control-pressed)]",
        /* Text, not a control - nothing to raise. */
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
        /* For placement over dark imagery, e.g. the cinematic hero. The lit
           edge is the only elevation that reads over a photograph; a shadow
           under it would land on nothing. */
        onDark:
          "border border-white/40 bg-transparent text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.18)] hover:border-white hover:bg-white/10 active:shadow-[var(--elevation-control-pressed)]",
      },
      size: {
        sm: "min-h-9 px-4 py-1.5 text-[0.8125rem]",
        md: "min-h-11 px-6 py-2 text-sm",
        lg: "min-h-13 px-8 py-2.5 text-[0.9375rem]",
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
      /*
       * A stable hook for season styling. The variant classes are generated by
       * `cva` and change whenever the design does, so a stylesheet that wanted
       * to reach every button would have to guess at them; this attribute is
       * the contract. Carries no styling of its own.
       */
      data-button=""
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
