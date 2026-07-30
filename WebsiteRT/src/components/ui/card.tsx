import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/utils";

/**
 * Card surface — the sanctuary "leaf".
 *
 * Where the old card was a crisp editorial plate, a leaf is a warm, softly
 * rounded sheet resting in sanctuary light: a generous radius, a hairline frame
 * that warms to gilding as the surface lifts, and the layered `--shadow-
 * sanctuary` so it sits on the parchment rather than floating flatly above it.
 *
 * `group/card` is declared here so children can react to a hover anywhere on
 * the card (media zoom, arrow nudge, keyline) without each card re-declaring a
 * group and colliding with the nested groups some of them already use.
 */
const cardVariants = cva(
  "group/card relative rounded-[var(--radius-sanctuary)] transition-all duration-500 ease-[var(--ease-out-expo)]",
  {
    variants: {
      variant: {
        /* A warm sheet lit by the layered sanctuary shadow — the default leaf
           the whole site is set on. */
        solid: "bg-[var(--surface)] ring-1 ring-sand-200/70 shadow-sanctuary",
        muted: "bg-[var(--surface-muted)] ring-1 ring-sand-200/60",
        outline: "bg-transparent ring-1 ring-sand-300",
        glass: "glass ring-1 ring-white/25",
        /* Inverted leaf for the occasional emphasis card. */
        dark: "bg-sand-950 text-white ring-1 ring-white/10 shadow-sanctuary",
      },
      interactive: {
        /* Lifts, deepens its shade with a faint gilded bloom, and warms its
           frame to gold — so the whole surface reads as the control. */
        true: "hover:-translate-y-1.5 hover:shadow-sanctuary-hover hover:ring-accent-300/70",
        false: "",
      },
      padded: {
        none: "",
        sm: "p-5",
        md: "p-6 sm:p-7",
        lg: "p-8 sm:p-10",
      },
    },
    defaultVariants: {
      variant: "solid",
      interactive: false,
      padded: "md",
    },
  },
);

export interface CardProps
  extends ComponentProps<"div">,
    VariantProps<typeof cardVariants> {
  /** Cards are usually `article` in a list, `div` when purely presentational. */
  as?: ElementType;
}

export function Card({
  className,
  variant,
  interactive,
  padded,
  as: Comp = "div",
  ...props
}: CardProps) {
  return (
    <Comp
      className={cn(cardVariants({ variant, interactive, padded }), className)}
      {...props}
    />
  );
}

/**
 * Media well at the top of a leaf. Clips to the card radius and slowly zooms
 * its image when the card is hovered — a restrained pan rather than a jump. Set
 * `arch` for a sanctuary-window top on featured media.
 */
export function CardMedia({
  className,
  ratio = "landscape",
  arch = false,
  ...props
}: ComponentProps<"div"> & {
  ratio?: "landscape" | "wide" | "square" | "portrait" | "fill";
  arch?: boolean;
}) {
  const ratios = {
    landscape: "aspect-[4/3]",
    wide: "aspect-[16/10]",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    fill: "h-full",
  } as const;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-sand-200",
        arch
          ? "window-arch"
          : "rounded-t-[var(--radius-sanctuary)]",
        "[&_img]:object-cover [&_img]:transition-transform [&_img]:duration-[900ms] [&_img]:ease-[var(--ease-out-expo)]",
        "group-hover/card:[&_img]:scale-[1.05]",
        ratios[ratio],
        className,
      )}
      {...props}
    />
  );
}

/** Body region. Grows to fill the card so footers line up across a grid row. */
export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col p-6 sm:p-7", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "font-display text-xl font-semibold leading-snug tracking-tight transition-colors duration-300 group-hover/card:text-[var(--primary)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("", className)} {...props} />;
}

/**
 * Pinned to the bottom of the body. A gilded hairline sits above it by default,
 * ruling the action off the copy the way an illuminated entry rules its footer.
 */
export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-auto flex items-center gap-3 border-t border-sand-200/80 pt-5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Chip that floats over card media — dates, counts, formats.
 * Frosted so it stays legible over any photograph.
 */
export function CardChip({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-sand-950/55 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The "read more" affordance — a small-caps gilded label with a nudging arrow.
 * Decorative: the card's overlay link is the real control, so this must never
 * become a focus stop of its own.
 */
export function CardAction({
  className,
  children,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "label inline-flex items-center gap-2 text-accent-700 transition-colors duration-300 group-hover/card:text-accent-600",
        "[&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-[var(--ease-out-expo)]",
        "group-hover/card:[&_svg]:translate-x-1",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
