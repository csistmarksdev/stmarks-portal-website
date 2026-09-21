"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

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
 * The route-level error boundary - what a visitor sees when a page throws.
 *
 * It renders inside the locale layout, so the masthead and footer stay put and
 * a reader is never stranded on a page with no way out. That is also why it is
 * laid out to match `not-found.tsx`: the two are the same moment to a visitor,
 * and they should not look like they came from different sites.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    // Replace with the project's error reporter when one is configured.
    console.error(error);
  }, [error]);

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

        <Heading as="h1" level="h1" className="mt-5">
          {t("title")}
        </Heading>

        <Text size="lg" tone="muted" className="mx-auto mt-4 max-w-md">
          {t("subtitle")}
        </Text>

        <IlluminatedDivider className="mt-11" />

        <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
          {/*
            `reset` first. A thrown render is often transient - a fetch that
            timed out against the Portal API - and re-rendering the same route
            costs the visitor nothing if it fails again.
          */}
          <Button size="lg" onClick={reset}>
            {t("retry")}
          </Button>

          <Button asChild size="lg" variant="secondary">
            <Link href={ROUTES.home}>{t("home")}</Link>
          </Button>
        </div>

        {/*
          Next hashes the real error into `digest` and gives the client nothing
          else - the message itself stays on the server, so it cannot leak a
          stack trace or a connection string to a visitor. The hash is the only
          thread tying what someone saw to what the server logged, so it is
          worth surfacing rather than swallowing: quoted to the office, it makes
          "the website broke" a searchable line in the log.
        */}
        {error.digest ? (
          <div className="mt-12">
            <Text
              size="sm"
              tone="muted"
              className="font-mono tracking-tight"
              /* The reference is a code, not prose: never translated, never
                 line-broken across its own characters, and read out one glyph
                 at a time by a screen reader rather than as a word. */
              translate="no"
            >
              {t("reference", { digest: error.digest })}
            </Text>

            <Text size="sm" tone="muted" className="mx-auto mt-2 max-w-sm">
              {t("referenceHint")}
            </Text>
          </div>
        ) : null}

        {/*
          The season's own word, and on this page the one that carries the most
          weight: through Holy Week it is "come to me, all you who are weary",
          and on Good Friday, when the site has been stripped of its colour, it
          is Lamentations - his mercies are new every morning. The verse comes
          from the message bundle rather than the Portal API, because the API is
          very often what has just failed here.
        */}
        <SeasonScripture season={getSeason(new Date())} className="mt-16" />
      </Container>
    </main>
  );
}
