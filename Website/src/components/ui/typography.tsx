import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";

import { renderInline } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Heading                                                                    */
/* -------------------------------------------------------------------------- */

const headingVariants = cva("font-display", {
  variants: {
    level: {
      // Below `sm` the two largest levels are fluid: a fixed 36px reads as
      // display type on a 500px screen but crowds a 320px one, and the church
      // name is long enough to wrap badly there. 28px→36px and 24px→30px
      // across the 320–640px range, meeting the `sm` sizes at the breakpoint.
      display:
        "text-[clamp(1.75rem,2.5vw+1.25rem,2.25rem)] sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] font-semibold",
      h1: "text-[clamp(1.5rem,1.875vw+1.125rem,1.875rem)] sm:text-4xl lg:text-5xl leading-[1.1] font-semibold",
      h2: "text-2xl sm:text-3xl lg:text-4xl leading-[1.15] font-semibold",
      h3: "text-xl sm:text-2xl leading-snug font-semibold",
      h4: "text-lg sm:text-xl leading-snug font-semibold",
    },
    tone: {
      default: "text-[var(--foreground)]",
      muted: "text-[var(--muted-foreground)]",
      primary: "text-[var(--primary)]",
      onDark: "text-white",
    },
  },
  defaultVariants: {
    level: "h2",
    tone: "default",
  },
});

export interface HeadingProps
  extends Omit<ComponentProps<"h2">, "color">,
    VariantProps<typeof headingVariants> {
  /**
   * The rendered tag. Kept separate from `level` so visual size and document
   * outline can differ — required for correct heading hierarchy.
   */
  as?: ElementType;
}

export function Heading({
  className,
  level,
  tone,
  as: Comp = "h2",
  ...props
}: HeadingProps) {
  return (
    // `data-heading` carries the visual level into CSS, where the Tamil metrics
    // in globals.css step the two largest levels down on phones. It tracks
    // `level` rather than `as`, since that is what sets the size.
    <Comp
      data-heading={level ?? "h2"}
      className={cn(headingVariants({ level, tone }), className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Text                                                                       */
/* -------------------------------------------------------------------------- */

const textVariants = cva("", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base leading-relaxed",
      lg: "text-lg leading-relaxed",
      // Fluid below its max for the same reason as the display headings: the
      // hero taglines set in `xl` sit right under them on phones.
      xl: "text-[clamp(1.0625rem,0.9375vw+0.875rem,1.25rem)] leading-relaxed",
    },
    tone: {
      default: "text-[var(--foreground)]",
      muted: "text-[var(--muted-foreground)]",
      primary: "text-[var(--primary)]",
      onDark: "text-white/80",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
    },
  },
  defaultVariants: {
    size: "base",
    tone: "default",
    weight: "normal",
  },
});

export interface TextProps
  extends Omit<ComponentProps<"p">, "color">,
    VariantProps<typeof textVariants> {
  as?: ElementType;
}

export function Text({
  className,
  size,
  tone,
  weight,
  as: Comp = "p",
  ...props
}: TextProps) {
  return (
    // `data-text` mirrors `data-heading`: it carries the size step into CSS so
    // the Tamil mobile scale in globals.css can step the whole type system down
    // together, rather than headings drifting out of proportion with body copy.
    <Comp
      data-text={size ?? "base"}
      className={cn(textVariants({ size, tone, weight }), className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Eyebrow                                                                    */
/* -------------------------------------------------------------------------- */

const eyebrowVariants = cva(
  "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      tone: {
        default: "text-accent-700",
        onDark: "text-accent-300",
        muted: "text-[var(--muted-foreground)]",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export interface EyebrowProps
  extends Omit<ComponentProps<"span">, "color">,
    VariantProps<typeof eyebrowVariants> {}

/** Small label above a section heading, set off by a short rule. */
export function Eyebrow({ className, tone, children, ...props }: EyebrowProps) {
  return (
    <span className={cn(eyebrowVariants({ tone }), className)} {...props}>
      <span aria-hidden className="h-px w-6 shrink-0 bg-current opacity-50" />
      {children}
    </span>
  );
}

/** Long-form body copy: renders paragraphs from a string array. */
export function Prose({
  paragraphs,
  className,
  tone = "muted",
  size = "lg",
  lead = false,
}: {
  paragraphs: string[];
  className?: string;
  tone?: TextProps["tone"];
  size?: TextProps["size"];
  /**
   * Open the read like a printed article: the first paragraph rides one step
   * larger, in the foreground tone, with a brass drop cap (Latin only — the CSS
   * scopes the initial to `lang="en"`).
   */
  lead?: boolean;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {paragraphs.map((paragraph, index) =>
        lead && index === 0 ? (
          <p
            key={index}
            className={cn(
              "drop-cap text-lg leading-relaxed sm:text-xl",
              tone === "onDark" ? "text-white/85" : "text-[var(--foreground)]",
            )}
          >
            {renderInline(paragraph)}
          </p>
        ) : (
          <Text key={index} size={size} tone={tone}>
            {renderInline(paragraph)}
          </Text>
        ),
      )}
    </div>
  );
}
