import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/utils";

/**
 * Card surface - a mounted sheet.
 *
 * The generous corner is the site's own and is kept. What changed is what the
 * corner contains: the frame carries the card now, not the shadow. The hover
 * used to raise the sheet a centimetre off the page and light a gold bloom
 * beneath it - the picture-of-an-app move. Now it rises a few pixels, the
 * frame draws in, and the shade deepens honestly.
 *
 * `group/card` is declared here so children can react to a hover anywhere on
 * the card (media zoom, arrow nudge, keyline) without each card re-declaring a
 * group and colliding with the nested groups some of them already use.
 */
const cardVariants = cva(
  "group/card relative rounded-card transition-all duration-500 ease-[var(--ease-out-expo)]",
  {
    variants: {
      variant: {
        /* A white sheet inside a hairline frame - the default the site is set on. */
        solid: "bg-[var(--surface)] ring-1 ring-[var(--border)] shadow-card",
        muted: "bg-[var(--surface-muted)] ring-1 ring-[var(--border)]",
        outline: "bg-transparent ring-1 ring-sand-300",
        glass: "glass ring-1 ring-white/25",
        /* Inverted sheet for the occasional emphasis card. */
        dark: "bg-sand-950 text-white ring-1 ring-white/10",
      },
      interactive: {
        /* A small rise, a drawn-in frame, a deeper shade: the whole surface
           reads as the control without the card taking off. */
        true: "hover:-translate-y-1 hover:shadow-card-hover hover:ring-sand-300",
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
 * its image when the card is hovered - a restrained pan rather than a jump. Set
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
        arch ? "window-arch" : "rounded-t-card",
        "[&_img]:object-cover [&_img]:transition-transform [&_img]:duration-[900ms] [&_img]:ease-[var(--ease-out-expo)]",
        "group-hover/card:[&_img]:scale-[1.05]",
        /*
         * The mount line.
         *
         * A hairline of the ink at four per cent, drawn just inside the edge of
         * the well. It is the line a framer leaves where the mount meets the
         * print, and it does one real job: a photograph whose corner happens to
         * be pale no longer bleeds into the white of the card, so every image
         * on the page sits in a frame of the same weight whatever is in it.
         */
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-sand-950/[0.06] after:content-['']",
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
        "mt-auto flex items-center gap-3 border-t border-[var(--border)] pt-5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Chip that floats over card media - dates, counts, formats.
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
 * The "read more" affordance - a small-caps gilded label with a nudging arrow.
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
        "label inline-flex items-center gap-2 text-[var(--muted-foreground)] transition-colors duration-300 group-hover/card:text-accent-600",
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
