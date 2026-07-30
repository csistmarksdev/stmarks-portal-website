import { CrossMark, SanctuaryMotes } from "@/components/common/ornament";
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
 * A full-width inked call-to-action band — the emphatic close to a page. An
 * indigo gradient with a brass bloom, film grain and a haloed title, so a plain
 * "get in touch" moment lands with the weight of an invitation.
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
        "relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-16 text-center text-white shadow-card ring-1 ring-white/10 sm:px-12 sm:py-20",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(58% 80% at 15% 0%, oklch(0.702 0.18 38 / 0.3), transparent 60%), radial-gradient(50% 70% at 100% 100%, oklch(0.586 0.196 18 / 0.32), transparent 66%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.13] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <SanctuaryMotes tone="onDark" />

      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <CrossMark size="lg" tone="onDark" />

        {eyebrow ? (
          <p className="label mt-6 text-accent-200">{eyebrow}</p>
        ) : null}

        <Heading
          as="h2"
          level="h1"
          tone="onDark"
          className="mt-4 text-[clamp(1.875rem,2.6vw+1.25rem,3rem)] leading-[1.1]"
        >
          {title}
        </Heading>

        {subtitle ? (
          <Text size="lg" tone="onDark" className="mt-5 max-w-xl">
            {subtitle}
          </Text>
        ) : null}

        {children ? (
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {children}
          </div>
        ) : null}
      </div>
    </Reveal>
  );
}
