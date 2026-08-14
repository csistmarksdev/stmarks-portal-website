import { CrossMark } from "@/components/common/ornament";
import { Reveal } from "@/components/motion/reveal";
import { Heading, Text } from "@/components/ui/typography";
import { GRAIN } from "@/lib/textures";
import { cn } from "@/lib/utils";

export interface CtaBandProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Buttons / links. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The inked invitation that closes a page.
 *
 * It used to be a diagonal gradient with two coloured blooms in opposite
 * corners and six gilded specks drifting over the top — four effects competing
 * for a panel whose whole job is to say *come and see*. Now it is one deep
 * brand ink, lit from above as if by a high window, with the grain of paper
 * over it. The cross, the invitation, the answer: nothing else, and room around
 * all three.
 */
export function CtaBand({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: CtaBandProps) {
  return (
    <Reveal
      className={cn(
        "relative isolate overflow-hidden rounded-[2rem] bg-brand-900 px-6 py-20 text-center text-white ring-1 ring-white/10 sm:px-12 sm:py-24",
        className,
      )}
    >
      {/* One warm fall of light entering high, as through a clerestory. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            `radial-gradient(62% 70% at 50% -12%, var(--season-light-dark, oklch(0.702 0.18 38 / 0.22)), transparent 68%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.11] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <CrossMark size="lg" tone="onDark" />

        {eyebrow ? (
          <p className="label mt-7 text-white/65">{eyebrow}</p>
        ) : null}

        <Heading
          as="h2"
          level="h1"
          tone="onDark"
          className="mt-5 text-[clamp(1.875rem,2.6vw+1.25rem,3rem)] leading-[1.12]"
        >
          {title}
        </Heading>

        <span
          aria-hidden
          className="mt-7 h-px w-24 rule-section rule-section-dark"
        />

        {subtitle ? (
          <Text size="lg" tone="onDark" className="mt-7 max-w-xl">
            {subtitle}
          </Text>
        ) : null}

        {children ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {children}
          </div>
        ) : null}
      </div>
    </Reveal>
  );
}
