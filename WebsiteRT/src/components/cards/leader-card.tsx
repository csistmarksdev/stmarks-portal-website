import { Mail, Phone } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Card, CardBody, CardMedia } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { Leader } from "@/types/content";

/** Initials fallback when a leader has no portrait on file. */
function initials(name: string): string {
  return name
    .replace(/^(Rev\.|Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export interface LeaderCardProps {
  leader: Leader;
  locale: Locale;
  /**
   * `feature` is the full-width split card used for clergy; `detailed` adds
   * the biography to a portrait card; `compact` is a single name/role line.
   */
  variant?: "default" | "detailed" | "compact" | "feature";
  /**
   * Which side the portrait takes in the `feature` variant. Alternating it
   * between sections keeps a page of clergy from marching down one edge.
   */
  mediaSide?: "left" | "right";
  className?: string;
}

/**
 * A member of the clergy or committee.
 *
 * `feature` runs wide with the portrait beside the biography; `detailed` leads
 * with a portrait above it; `compact` is a slim horizontal card for the
 * committee grid, where there are enough people that full portraits would turn
 * the page into a wall of faces.
 */
export async function LeaderCard({
  leader,
  locale,
  variant = "default",
  mediaSide = "left",
  className,
}: LeaderCardProps) {
  const t = await getTranslations("leadership.card");

  const name = localize(leader.name, locale);
  const designation = localize(leader.designation, locale);
  const bio = leader.bio ? localize(leader.bio, locale) : null;

  if (variant === "compact") {
    return (
      <Card
        as="article"
        variant="solid"
        padded="none"
        className={cn("flex items-center gap-4 p-4 sm:p-5", className)}
      >
        <Avatar leader={leader} locale={locale} name={name} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold leading-snug">
            {name}
          </p>
          <p className="label mt-1.5 truncate text-[var(--muted-foreground)]">{designation}</p>
        </div>
      </Card>
    );
  }

  if (variant === "feature") {
    const mediaFirst = mediaSide === "left";

    // An editorial clergy profile set on the page ground rather than boxed in a
    // gradient split: the portrait framed in the sanctuary arch beside the name
    // and word, the two alternating sides down the page so a row of clergy never
    // marches down one edge.
    return (
      <div
        className={cn(
          "grid items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-16",
          className,
        )}
      >
        <figure
          className={cn(
            "relative mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-none",
            mediaFirst ? "lg:order-1" : "lg:order-2",
          )}
        >
          <div className="lancet-arch relative aspect-[4/5] overflow-hidden bg-sand-200 shadow-card ring-1 ring-[var(--border)]">
            {leader.image ? (
              <Image
                src={leader.image.url}
                alt={localize(leader.image.alt, locale)}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="grid size-full place-items-center bg-brand-800"
              >
                <span className="font-display text-7xl font-semibold text-white/85">
                  {initials(name)}
                </span>
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-sand-950/25 to-transparent"
            />
          </div>
        </figure>

        <div
          className={cn(
            // `min-w-0`: without it an email's unbreakable width pushes the
            // track past a phone screen instead of truncating.
            "flex min-w-0 flex-col lg:col-span-7",
            mediaFirst ? "lg:order-2" : "lg:order-1",
          )}
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-6 shrink-0 rule-section" />
            <p className="label text-[var(--muted-foreground)]">{designation}</p>
          </div>

          <h3 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {name}
          </h3>

          {leader.servingSince ? (
            <p className="numeric label mt-3 text-[var(--muted-foreground)]">
              {t("since", { year: leader.servingSince })}
            </p>
          ) : null}

          <span aria-hidden className="mt-6 block h-px w-20 rule-section" />

          {bio ? (
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
              {bio}
            </p>
          ) : null}

          {leader.email || leader.phone ? (
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              {leader.email ? (
                <a
                  href={`mailto:${leader.email}`}
                  aria-label={t("emailLabel", { name })}
                  className="link-underline inline-flex min-w-0 max-w-full items-center gap-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)]"
                >
                  <Mail aria-hidden className="size-4 shrink-0 text-accent-600" />
                  <span className="truncate">{leader.email}</span>
                </a>
              ) : null}

              {leader.phone ? (
                <a
                  href={`tel:${leader.phone.replace(/\s/g, "")}`}
                  aria-label={t("phoneLabel", { name })}
                  className="link-underline numeric inline-flex items-center gap-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)]"
                >
                  <Phone aria-hidden className="size-4 shrink-0 text-accent-600" />
                  {leader.phone}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const hasContact = variant === "detailed" && (leader.email || leader.phone);

  return (
    <Card
      as="article"
      variant="solid"
      padded="none"
      className={cn("flex h-full flex-col overflow-hidden", className)}
    >
      {leader.image ? (
        <CardMedia ratio="portrait">
          <Image
            src={leader.image.url}
            alt={localize(leader.image.alt, locale)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-sand-950/45 via-transparent to-transparent"
          />
        </CardMedia>
      ) : (
        /* No portrait on file: a monogram panel, so the grid keeps its rhythm
           instead of collapsing to a shorter card. */
        <div
          aria-hidden
          className="grid aspect-[3/4] shrink-0 place-items-center rounded-t-card bg-brand-800"
        >
          <span className="font-display text-5xl font-semibold text-white/85">
            {initials(name)}
          </span>
        </div>
      )}

      <CardBody>
        <h3 className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
          {name}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="label text-[var(--muted-foreground)]">{designation}</p>

          {leader.servingSince ? (
            <p className="numeric label text-[var(--muted-foreground)]">
              {t("since", { year: leader.servingSince })}
            </p>
          ) : null}
        </div>

        {variant === "detailed" && bio ? (
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {bio}
          </p>
        ) : null}

        {hasContact ? (
          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--border)] pt-5">
            {leader.email ? (
              <a
                href={`mailto:${leader.email}`}
                aria-label={t("emailLabel", { name })}
                className="inline-flex items-center gap-2.5 text-sm text-[var(--muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--primary)] hover:underline"
              >
                <Mail aria-hidden className="size-4 shrink-0 text-accent-600" />
                <span className="truncate">{leader.email}</span>
              </a>
            ) : null}

            {leader.phone ? (
              <a
                href={`tel:${leader.phone.replace(/\s/g, "")}`}
                aria-label={t("phoneLabel", { name })}
                className="numeric inline-flex items-center gap-2.5 text-sm text-[var(--muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--primary)] hover:underline"
              >
                <Phone aria-hidden className="size-4 shrink-0 text-accent-600" />
                <span className="truncate">{leader.phone}</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Avatar({
  leader,
  locale,
  name,
  size,
}: {
  leader: Leader;
  locale: Locale;
  name: string;
  size: "sm" | "lg";
}) {
  const dimension = size === "sm" ? "size-12" : "size-24 sm:size-28";

  if (leader.image) {
    return (
      <div
        className={cn(
          "window-arch relative shrink-0 overflow-hidden bg-sand-200 ring-1 ring-accent-500/25",
          dimension,
        )}
      >
        <Image
          src={leader.image.url}
          alt={localize(leader.image.alt, locale)}
          fill
          sizes={size === "sm" ? "48px" : "112px"}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "window-arch grid shrink-0 place-items-center bg-brand-800 font-display font-semibold text-white ring-1 ring-accent-500/25",
        dimension,
        size === "sm" ? "text-sm" : "text-2xl",
      )}
    >
      {initials(name)}
    </div>
  );
}
