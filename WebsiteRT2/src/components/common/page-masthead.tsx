import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export interface PageMastheadProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * The opening of a page that has no hero.
 *
 * The archives - albums, events, posts - are reached by a button inside a
 * chapter that has *just* shown the reader its full-bleed hero. Repeating that
 * hero on the page the button leads to means a screen of photography, a title,
 * and then the same title again three hundred pixels later; the reader pays a
 * second full viewport to be told what they already clicked on. So the archives
 * open on the site's own parchment with the copy the hero would have carried,
 * set as type.
 *
 * It carries the `h1`, which the hero used to. `SectionHeading` is deliberately
 * not reused here even though it takes the same three props: it always renders
 * an `h2`, which is right for a section of a page and wrong for the top of one -
 * a page whose largest heading is an `h2` has no document outline at all.
 *
 * The top padding clears the floating header. `--header-height` is the bar
 * itself rather than the space it occupies - the header sits inside its own
 * `pt-5` - so the section padding beneath this does the rest.
 */
export function PageMasthead({
  eyebrow,
  title,
  subtitle,
  className,
}: PageMastheadProps) {
  return (
    <div className={cn("pt-[calc(var(--header-height)+var(--safe-top)+2.5rem)]", className)}>
      <Container>
        <div className="max-w-3xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}

          <Heading as="h1" level="h1" className="mt-5">
            {title}
          </Heading>

          <span aria-hidden className="mt-7 block h-px w-24 rule-section" />

          {subtitle ? (
            <Text size="xl" tone="muted" className="mt-6 max-w-2xl">
              {subtitle}
            </Text>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
