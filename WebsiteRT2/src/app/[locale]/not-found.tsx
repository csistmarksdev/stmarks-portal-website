import { getTranslations } from "next-intl/server";

import { IlluminatedDivider } from "@/components/common/ornament";
import { SeasonScripture } from "@/components/common/season-scripture";
import { SectionOrnaments } from "@/components/common/section-ornaments";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import { getSeason } from "@/lib/liturgical-year";

/**
 * Where a reader is offered to go next.
 *
 * A dead end is the one page where "return home" alone is the least useful
 * answer: someone who mistyped a URL or followed a stale bulletin link has an
 * errand, and the home page makes them start it over. These are the five
 * destinations that errand is most likely to have been, labelled from the same
 * `nav` namespace as the masthead so the words never drift apart.
 */
const SUGGESTIONS = [
  { href: ROUTES.about, label: "about" },
  { href: ROUTES.events, label: "events" },
  { href: ROUTES.gallery, label: "gallery" },
  { href: ROUTES.announcements, label: "announcements" },
  { href: ROUTES.downloads, label: "downloads" },
] as const;

export default async function NotFound() {
  const [t, tNav] = await Promise.all([
    getTranslations("notFound"),
    getTranslations("nav"),
  ]);

  /*
   * The season, resolved here rather than left to the client.
   *
   * This route is server-rendered on demand, so unlike the prerendered pages it
   * genuinely knows the date. Passing it down means the scripture is already
   * the right one at first paint instead of showing ordinary time for a frame
   * and then changing under a reader who had started reading it.
   */
  const season = getSeason(new Date());

  return (
    <main
      id="main"
      /* `relative isolate` so the season's ornament layer, which is `-z-10`,
         has this element to anchor to and stays behind the words. */
      className="relative isolate flex min-h-[80vh] items-center pt-[var(--header-height)]"
    >
      <SectionOrnaments />

      <Container size="md" className="relative py-20 text-center sm:py-28">
        <Eyebrow>{t("eyebrow")}</Eyebrow>

        {/*
          The numeral is decoration, not content: the heading under it already
          says the page is missing, and a screen reader announcing "four
          hundred and four" ahead of that says nothing a visitor can use.
          Hidden from the accessibility tree, kept for the eye.

          Struck in `--sacred` rather than the brand blue it used to be. That
          token is the one the season blocks retune - crimson in ordinary time,
          violet through Lent, drained to grey on Good Friday - so the largest
          thing on the page now keeps the church's year instead of sitting
          outside it in a fixed colour.
        */}
        <p
          aria-hidden
          className="mt-5 font-display text-7xl font-medium leading-none tracking-tight text-[var(--sacred)]/25 sm:text-8xl"
        >
          404
        </p>

        <Heading as="h1" level="h1" className="mt-7">
          {t("title")}
        </Heading>

        <Text size="lg" tone="muted" className="mx-auto mt-4 max-w-md">
          {t("subtitle")}
        </Text>

        <IlluminatedDivider className="mt-11" />

        <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href={ROUTES.home}>{t("cta")}</Link>
          </Button>

          <Button asChild size="lg" variant="secondary">
            <Link href={ROUTES.contact}>{t("contactCta")}</Link>
          </Button>
        </div>

        <nav aria-label={t("suggestionsLabel")} className="mt-14">
          <Text size="sm" tone="muted">
            {t("suggestions")}
          </Text>

          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {SUGGESTIONS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-[var(--foreground)] underline-offset-4 transition-colors hover:text-[var(--primary)] hover:underline"
                >
                  {tNav(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/*
          The last word on the page belongs to the season, not to us. In Lent it
          is Isaiah - "seek the LORD while he may be found"; at Easter it is the
          angel at the tomb - "why do you seek the living among the dead?". Both
          are the season's own text and both are about looking in the wrong
          place, which is what has just happened.
        */}
        <SeasonScripture season={season} className="mt-16" />
      </Container>
    </main>
  );
}
