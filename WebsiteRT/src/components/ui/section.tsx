import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { CrossMark } from "@/components/common/ornament";
import { SectionOrnaments } from "@/components/common/section-ornaments";
import { Reveal } from "@/components/motion/reveal";
import { GRAIN } from "@/lib/textures";
import { cn } from "@/lib/utils";

import { Container, type ContainerProps } from "./container";
import { Heading, Text } from "./typography";

const sectionVariants = cva("relative isolate w-full", {
  variants: {
    /*
     * Breath. A church is mostly empty space and that is the point of it - the
     * quiet around a thing is what tells you it is worth attending to. The
     * scale runs one step more generous than a marketing page would, and the
     * largest step is genuinely large, because the sections it carries (the
     * presbyter's letter, the week's verse, those who serve) are the ones the
     * reader is meant to slow down for.
     */
    spacing: {
      none: "",
      sm: "py-14 sm:py-18",
      md: "py-18 sm:py-24 lg:py-28",
      lg: "py-24 sm:py-32 lg:py-40",
    },
    tone: {
      default: "bg-[var(--background)]",
      surface: "bg-[var(--surface)]",
      // A warm inset panel: hairline rules top and bottom frame the muted band
      // so the alternating rhythm reads as layered sheets in sanctuary light
      // rather than a flat colour swap between sections.
      muted: "border-y border-[var(--border)] bg-[var(--surface-muted)]",
      dark: "bg-sand-950 text-white",
      brand: "bg-brand-900 text-white",
      transparent: "bg-transparent",
    },
  },
  defaultVariants: {
    spacing: "md",
    tone: "default",
  },
});

export interface SectionProps
  extends ComponentProps<"section">,
    VariantProps<typeof sectionVariants> {
  containerSize?: ContainerProps["size"];
  /** Set to false to lay out the section edge-to-edge. */
  contained?: boolean;
  /**
   * Ambient paper/ink texture and sanctuary light behind the content. On by
   * default so the whole page shares one surface; set false for sections that
   * supply their own atmosphere or sit over full-bleed media.
   */
  atmosphere?: boolean;
}

/**
 * A full-width page section with consistent vertical rhythm.
 * Pair with `SectionHeading` for the standard ornament/title/subtitle block.
 */
export function Section({
  className,
  spacing,
  tone,
  containerSize = "xl",
  contained = true,
  atmosphere = true,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(sectionVariants({ spacing, tone }), className)}
      {...props}
    >
      {atmosphere ? <SectionAtmosphere tone={tone} /> : null}

      {/*
        Christmas decorations in the gutters, on the same `-z-10` layer as the
        section's light and grain - so they are always behind the words, and
        nothing else has to know they exist. Renders `null` for the rest of the
        year, and on any screen too narrow to have a margin worth decorating.
      */}
      <SectionOrnaments onDark={tone === "dark" || tone === "brand"} />

      {contained ? (
        <Container size={containerSize} className="relative">
          {children}
        </Container>
      ) : (
        children
      )}
    </section>
  );
}

/**
 * The surface behind a section's content. `isolate` on the section keeps this
 * `-z-10` layer above the tone fill but beneath the content, so it reads as the
 * material of the section rather than a scrim over it.
 *
 * Light grounds gain a whisper of printed grain plus a very soft off-axis glow
 * - light falling through a window - so no two plain parchment bands sit flat
 * beside each other. Ink grounds lift the grain and add a warmer crimson-gilt
 * bloom, so the dark bands breathe.
 */
function SectionAtmosphere({ tone }: { tone: SectionProps["tone"] }) {
  if (tone === "transparent") return null;

  const onDark = tone === "dark" || tone === "brand";

  if (onDark) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.1] mix-blend-overlay"
          style={{ backgroundImage: GRAIN }}
        />
        <div className="glow-sanctuary-dark absolute inset-0" />
      </div>
    );
  }

  /*
   * Light grounds carry grain and one fall of light, and nothing else.
   *
   * There were four layers here: grain, two tinted radial washes, a white
   * gradient down from the top and a grey one up from the foot. Stacked on
   * every section, the washes tinted the parchment unevenly and the foot
   * gradient put a soft grey band across every seam in the page - a section
   * boundary that reads as a smudge rather than as a decision. Paper has a
   * texture and a light source; it does not have four.
   */
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <div className="glow-sanctuary absolute inset-0" />
    </div>
  );
}

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /**
   * Retained for API compatibility with existing call sites; the redesign heads
   * every section with the cross ornament rather than a printed folio, so this
   * is no longer rendered.
   */
  index?: string;
  /** Visual size of the title; the tag stays `h2` for document outline. */
  level?: "h1" | "h2";
  align?: "left" | "center";
  tone?: "default" | "onDark";
  className?: string;
  /** Rendered opposite the kicker on the masthead, e.g. a "view all" link. */
  action?: React.ReactNode;
}

/**
 * Section masthead - a sanctuary header.
 *
 * The crimson cross of the crest opens the block, a small-caps kicker beside
 * it; an oversized display title drops below, closed by a gilded rule that
 * blooms from its centre. The counterpart to a printed order of service's
 * dateline, re-set as an illuminated heading so each section opens with the
 * weight and reverence of a page rather than reading as a sub-head.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  level = "h2",
  align = "left",
  tone = "default",
  className,
  action,
}: SectionHeadingProps) {
  const onDark = tone === "onDark";

  // A big, cinematic type ramp so a section opens with the presence of a page
  // title. Deliberately larger than the default h2 - sections should land with
  // weight, not read as sub-heads.
  const titleClass =
    level === "h1"
      ? "text-[clamp(2.25rem,3.6vw+1rem,3.5rem)] leading-[1.05] tracking-[-0.028em]"
      : "text-[clamp(1.875rem,2.6vw+1rem,2.75rem)] leading-[1.1] tracking-[-0.022em]";

  const kicker = eyebrow ? (
    <span
      className={cn(
        "label truncate",
        onDark ? "text-accent-200" : "text-accent-700",
      )}
    >
      {eyebrow}
    </span>
  ) : null;

  if (align === "center") {
    return (
      <Reveal className={cn("mb-14 sm:mb-20", className)}>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <CrossMark size="md" tone={onDark ? "onDark" : "sacred"} />

          {kicker ? <div className="mt-5">{kicker}</div> : null}

          <Heading
            as="h2"
            level={level}
            tone={onDark ? "onDark" : "default"}
            className={cn("mt-5", titleClass)}
          >
            {title}
          </Heading>

          <span
            aria-hidden
            className={cn(
              "mt-7 h-px w-28 rule-section",
              onDark && "rule-section-dark",
            )}
          />

          {subtitle ? (
            <Text
              size="lg"
              tone={onDark ? "onDark" : "muted"}
              className="mt-6 max-w-2xl"
            >
              {subtitle}
            </Text>
          ) : null}
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal className={cn("mb-14 sm:mb-20", className)}>
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <CrossMark size="sm" tone={onDark ? "onDark" : "sacred"} />
            {kicker}
          </div>

          {/* Must be allowed to shrink: with `shrink-0` a wide action (two
              Tamil CTAs run ~470px) keeps its max-content width and drags the
              whole page into horizontal scroll on phones. Capped to the
              measure, an inner `flex-wrap` action can break onto two lines. */}
          {action ? <div className="min-w-0 max-w-full">{action}</div> : null}
        </div>

        <Heading
          as="h2"
          level={level}
          tone={onDark ? "onDark" : "default"}
          className={cn("mt-6 max-w-3xl", titleClass)}
        >
          {title}
        </Heading>

        <span
          aria-hidden
          className={cn(
            "mt-7 block h-px w-24 rule-section",
            onDark && "rule-section-dark",
          )}
        />

        {subtitle ? (
          <Text
            size="lg"
            tone={onDark ? "onDark" : "muted"}
            className="mt-6 max-w-2xl"
          >
            {subtitle}
          </Text>
        ) : null}
      </div>
    </Reveal>
  );
}
