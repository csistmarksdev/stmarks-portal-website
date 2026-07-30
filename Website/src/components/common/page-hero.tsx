import { HeroSlideshow } from "@/components/common/hero-slideshow";
import { ScrollCue } from "@/components/common/scroll-cue";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Backdrop slides, crossfaded behind the copy. Omit for the plain wash. */
  images?: string[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * Standard inner-page header. Sits below the fixed site header, so it carries
 * the top padding that clears it.
 *
 * Tall enough to give the backdrop imagery room to read; the copy sits at the
 * bottom of that box rather than floating in the middle of it.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  images,
  className,
  children,
}: PageHeroProps) {
  const slides = images?.length ? images : null;

  return (
    <section
      className={cn(
        // `svh` rather than `vh`: on mobile the cue must clear the browser
        // chrome instead of hiding beneath it.
        "relative flex min-h-svh items-end overflow-hidden bg-sand-950 text-white",
        // Bottom padding clears the scroll cue rather than colliding with it.
        "pb-28 pt-[calc(var(--header-height)+5rem)] sm:pb-32 sm:pt-[calc(var(--header-height)+7rem)]",
        className,
      )}
    >
      {slides ? <HeroSlideshow images={slides} /> : null}

      {/*
        Neutral scrim — no colour cast, so the photography reads as itself.
        Weighted to the bottom and the left, where the copy sits.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"
      />

      <Container className="relative w-full">
        <Reveal className="max-w-3xl">
          {eyebrow ? <Eyebrow tone="onDark">{eyebrow}</Eyebrow> : null}

          <Heading as="h1" level="h1" tone="onDark" className="mt-5">
            {title}
          </Heading>

          {subtitle ? (
            <Text size="xl" tone="onDark" className="mt-5 max-w-2xl">
              {subtitle}
            </Text>
          ) : null}

          {children ? <div className="mt-8">{children}</div> : null}
        </Reveal>
      </Container>

      <ScrollCue className="pointer-events-none absolute inset-x-0 bottom-8" />
    </section>
  );
}
