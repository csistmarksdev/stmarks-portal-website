import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { AshWednesdayScene } from "@/components/common/ash-wednesday-scene";
import { ChristmasScene } from "@/components/common/christmas-scene";
import { EasterScene } from "@/components/common/easter-scene";
import { GoodFridayScene } from "@/components/common/good-friday-scene";
import { LentScene } from "@/components/common/lent-scene";
import {
  SOCIAL_ICONS,
  SOCIAL_LABELS,
} from "@/components/common/social-icons";
import { Container } from "@/components/ui/container";
import { FOOTER_QUICK_LINKS } from "@/constants/navigation";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localize";
import { GRAIN } from "@/lib/textures";
import { cn } from "@/lib/utils";
import { getChurchProfile, getServiceTimings } from "@/services";
import type { Locale } from "@/i18n/routing";

/** Small-caps column header with a brass tick, echoing the section mastheads. */
function ColumnHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="label flex items-center gap-2.5 text-white/55">
      <span aria-hidden className="h-px w-5 rule-section" />
      {children}
    </h3>
  );
}

export async function SiteFooter() {
  const [t, tNav, tSite, profile, timings] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getTranslations("site"),
    getChurchProfile(),
    getServiceTimings(),
  ]);

  const locale = (await getLocale()) as Locale;
  const year = new Date().getFullYear();

  // The footer shows Sunday services only; the full table lives on /about.
  const sundayTimings = timings.filter((timing) => timing.day.en === "Sunday");

  const address = profile.address;

  return (
    <footer className="cv-auto relative isolate overflow-hidden bg-sand-950 text-white">
      {/* Brass edge and a soft brass bloom from the top, so the footer opens
          like the head of a printed colophon rather than a flat slab. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px rule-section" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64"
        style={{
          backgroundImage:
            `radial-gradient(60% 100% at 30% 0%, var(--season-light-dark, oklch(0.508 0.166 34 / 0.16)), transparent 70%)`,
        }}
      />

      <Container className="py-20 lg:py-28">
        {/* Masthead band: the header's lockup at footer scale, standfirst, socials. */}
        <div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            {/*
              The same lockup the header carries - parish crest, name over the
              unit, diocese arms - so the page opens and closes on one mark.
              The name steps down from the old oversized setting: at 3rem it
              dwarfed the crests either side of it, and the point of the lockup
              is that the three read as one object.
            */}
            <div className="flex items-center justify-center gap-4 sm:gap-5 lg:justify-start">
              <Image
                src="/Logo1.svg"
                alt=""
                aria-hidden
                width={940}
                height={940}
                unoptimized
                className="size-14 shrink-0 object-contain sm:size-16"
              />

              {/* Wraps rather than truncates: a footer has the room, and the
                  header is the only place the name must stay on one line. */}
              <span className="flex min-w-0 flex-col text-center">
                {/*
                  `wordmark.line1`, not `site.name`: the latter is the full
                  legal name, "…Church, Madipakkam", which put the locality
                  immediately above the unit line saying it again. The header
                  splits the same name across these two keys - the lockup reads
                  from both so the two masts stay identical by construction.
                */}
                <span className="font-display text-[clamp(1.375rem,2.2vw+0.75rem,2rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-balance">
                  {tSite("wordmark.line1")}
                </span>
                <span className="mt-2 text-[0.65rem] uppercase tracking-[0.16em] text-white/55 sm:text-xs">
                  {tSite("wordmark.line2")}
                </span>
              </span>

              {/*
                A square box, `object-contain` keeping the shield its own
                portrait shape inside it - so it is *boxed* like the seal
                opposite without being *scaled* like it.

                The box, not the drawing, is the point. This lockup is centred
                (`justify-center` until `lg`), and centring puts the row's
                midpoint on the page's: with a 56px seal on one side and a 34px
                shield on the other, the wordmark between them sat 11px right
                of centre - exactly half the 22px difference - which is what
                made the footer's mast look subtly off-axis on a phone.
                Matching the boxes puts the name on the page's centre line and
                leaves both drawings at the size they were.
              */}
              <Image
                src="/Logo2.svg"
                alt=""
                aria-hidden
                width={523}
                height={860}
                unoptimized
                className="size-14 shrink-0 object-contain sm:size-16"
              />
            </div>

            {/*
              `mx-auto lg:mx-0` is what makes `text-center` mean anything here.
              The measure is capped at `max-w-md`, and a capped block with no
              auto margins sits at the left of its column - so below `lg`, where
              the lockup above is centred, the standfirst was centring its lines
              inside a 448px box that was itself parked on the left edge. At
              945px that put the paragraph's midpoint at 256 against the
              lockup's 472.5, which reads as the mast and the text belonging to
              two different grids.

              Auto margins centre the box itself, so the two midpoints coincide.
              Dropped again at `lg`, where the lockup turns to `justify-start`
              and the standfirst to `text-left`: there the block belongs hard
              against the column's left edge, and both start at 128.
            */}
            <p className="mt-7 mx-auto max-w-md text-center text-sm leading-relaxed text-white/55 lg:mx-0 lg:text-left">
              {tSite("description")}
            </p>
          </div>

          <div className="lg:col-span-4 lg:pb-2">
            {profile.socials.length > 0 ? (
              <>
                <ColumnHead>{t("followUs")}</ColumnHead>
                <ul className="mt-5 flex flex-wrap items-center gap-3">
                  {profile.socials.map((social) => {
                    const Icon = SOCIAL_ICONS[social.platform];
                    const platform = SOCIAL_LABELS[social.platform];

                    return (
                      <li key={social.platform}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("socialLabel", { platform })}
                          className="grid size-11 place-items-center rounded-full border border-white/15 text-white/70 transition-colors duration-300 hover:border-accent-400/60 hover:bg-white/5 hover:text-accent-200"
                        >
                          <Icon className="size-4" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}

            <a
              href={address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline group mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent-300 transition-colors hover:text-accent-200"
            >
              {t("getDirections")}
              <ArrowUpRight
                aria-hidden
                className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </div>
        </div>

        {/* Ruled columns. Vertical column rules on desktop divide them the way a
            broadsheet rules off its columns. */}
        <div className="grid gap-x-8 gap-y-12 pt-14 sm:grid-cols-2 lg:grid-cols-12 lg:divide-x lg:divide-white/10">
          <nav
            className="lg:col-span-4 lg:pr-8"
            aria-label={t("quickLinks")}
          >
            <ColumnHead>{t("quickLinks")}</ColumnHead>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3.5">
              {FOOTER_QUICK_LINKS.map((link, i) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-baseline gap-2.5 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <span
                      aria-hidden
                      className="index-num text-[0.6875rem] text-white/25 transition-colors group-hover:text-accent-300"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="link-underline">{tNav(link.labelKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3 lg:px-8">
            <ColumnHead>{t("serviceTimings")}</ColumnHead>
            <ul className="mt-6 space-y-4">
              {sundayTimings.map((timing) => (
                <li key={timing.id} className="text-sm">
                  <p className="numeric font-display text-base font-semibold text-white/90">
                    {localize(timing.time, locale)}
                  </p>
                  <p className="mt-0.5 text-white/50">
                    {localize(timing.service, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 lg:pl-8">
            <ColumnHead>{t("address")}</ColumnHead>

            <address className="mt-6 space-y-4 text-sm not-italic text-white/70">
              <p className="flex gap-3">
                <MapPin
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-accent-400/70"
                />
                <span>
                  {localize(address.lines, locale)}
                  <br />
                  {localize(address.city, locale)} {address.postalCode}
                  <br />
                  {localize(address.state, locale)},{" "}
                  {localize(address.country, locale)}
                </span>
              </p>

              {profile.phone.map((phone) => (
                <p key={phone} className="flex items-center gap-3">
                  <Phone
                    aria-hidden
                    className="size-4 shrink-0 text-accent-400/70"
                  />
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="transition-colors hover:text-white"
                  >
                    {phone}
                  </a>
                </p>
              ))}

              {profile.email.map((email) => (
                <p key={email} className="flex items-center gap-3">
                  <Mail
                    aria-hidden
                    className="size-4 shrink-0 text-accent-400/70"
                  />
                  <a
                    href={`mailto:${email}`}
                    className="break-all transition-colors hover:text-white"
                  >
                    {email}
                  </a>
                </p>
              ))}
            </address>
          </div>
        </div>

        <div
          className={cn(
            "mt-16 flex flex-col gap-3 border-t border-white/10 pt-8",
            "sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <p className="text-xs text-white/40">
            {t("copyright", { year, name: tSite("name") })}
          </p>
          <p className="text-xs text-white/40">{t("builtWith")}</p>
        </div>
      </Container>

      {/*
        The season's own scene at the foot of the page: a snowy stand of firs
        through December, a bare wilderness through Lent and Holy Week, and
        nothing whatever the rest of the year - including Good Friday, when the
        page is stripped. Each component gates itself, so the footer is unchanged
        for most of the calendar.

        Outside the `Container` deliberately: the ground line has to reach both
        edges of the page rather than stopping at the content measure.
      */}
      <ChristmasScene />
      <AshWednesdayScene />
      <LentScene />
      <GoodFridayScene />
      <EasterScene />
    </footer>
  );
}
