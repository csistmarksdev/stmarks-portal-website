import { PinnedHero } from "@/components/common/pinned-hero";
import { ScrollCue } from "@/components/common/scroll-cue";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * A page hero holds the reader for less than a chapter hero does.
 *
 * Two frames, where a chapter hero uses everything in its folder: the contact
 * page is somewhere people arrive with something to do, and every frame is a
 * little over half a screen of scroll between them and the address. A chapter
 * opening on the long page can afford to be an occasion; the one page with a
 * form on it cannot.
 */
const PAGE_FRAMES = 2;

export interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Backdrop photography, shown one screen at a time. Omit for the plain wash. */
  images?: string[];
  /**
   * Which way the photography travels while the hero is locked.
   * Alternated down the page - see `heroDirection` in `constants/site`.
   */
  direction?: "left" | "right";
  /**
   * `page` opens a document; `section` opens a chapter of one.
   *
   * The site is a single page now, so this header is used two ways. At the top
   * of the contact page it is what it always was: the reader's first
   * impression, carrying the `h1` and the scroll cue that says there is more
   * below.
   *
   * Down the home page it opens each chapter instead, and two of those things
   * would be wrong there. Eight `h1`s would leave the document with no outline
   * at all, and a scroll cue means "the page starts here", which is a lie
   * eight-ninths of the way down. Both variants are otherwise the same object:
   * a full screen of photography with the title set into the foot of it.
   */
  variant?: "page" | "section";
  /**
   * Whether the first frame is fetched with priority. True for a page header,
   * which is the largest paint in the viewport; false for a chapter further
   * down, where eight competing priority images would starve the one that
   * actually is.
   */
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * The standard header, for a page or for a chapter of one.
 *
 * A full screen of photography with the copy set into the foot of it. Where
 * there is more than one photograph the hero locks to the viewport and moves
 * them across before releasing the page - see {@link PinnedHero}, which owns
 * that behaviour and the fallbacks for touch and reduced motion.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  images,
  direction,
  variant = "page",
  priority,
  className,
  children,
}: PageHeroProps) {
  const slides = images?.length ? images : null;
  const isSection = variant === "section";
  const eager = priority ?? !isSection;

  const frameClassName = cn(
    // `svh` rather than `vh`: on mobile the copy and cue must clear the
    // browser chrome instead of hiding beneath it.
    "relative flex min-h-svh items-end overflow-hidden bg-sand-950 text-white",
    isSection
      ? "py-20 sm:py-24"
      : // Bottom padding clears the scroll cue rather than colliding with it.
        "pb-28 pt-[calc(var(--header-height)+5rem)] sm:pb-32 sm:pt-[calc(var(--header-height)+7rem)]",
    className,
  );

  const copy = (
    <>
      <Container className="relative w-full">
        <Reveal className="max-w-3xl">
          {eyebrow ? <Eyebrow tone="onDark">{eyebrow}</Eyebrow> : null}

          <Heading
            as={isSection ? "h2" : "h1"}
            level="h1"
            tone="onDark"
            className="mt-5"
          >
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

      {isSection ? null : (
        <ScrollCue className="pointer-events-none absolute inset-x-0 bottom-8" />
      )}
    </>
  );

  if (slides) {
    return (
      <PinnedHero
        images={slides}
        direction={direction}
        priority={eager}
        maxFrames={isSection ? undefined : PAGE_FRAMES}
        variant={variant}
        frameClassName={frameClassName}
      >
        {copy}
      </PinnedHero>
    );
  }

  /*
   * No photography on file: the plain wash, and nothing to hold the page for.
   *
   * The scrim is still laid down, unmoving. There is no strip for it to breathe
   * with, but the ground beneath the copy has to be the same one every other
   * hero gives it - a title that sits on a slightly different black on the one
   * hero whose folder is empty is the kind of difference nobody can name and
   * everybody sees.
   */
  return (
    <section data-hero-frame data-hero-variant={variant} className={frameClassName}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"
      />

      {copy}
    </section>
  );
}
