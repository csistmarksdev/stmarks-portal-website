import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

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
      <span aria-hidden className="h-px w-5 rule-brass" />
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
      <div aria-hidden className="absolute inset-x-0 top-0 h-px rule-brass" />
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
            "radial-gradient(60% 100% at 30% 0%, oklch(0.508 0.105 65 / 0.16), transparent 70%)",
        }}
      />

      <Container className="py-20 lg:py-28">
        {/* Masthead band: crest, oversized church name, standfirst, socials. */}
        <div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-4">
              <Image
                src="/logo-crest.png"
                alt=""
                aria-hidden
                width={56}
                height={56}
                unoptimized
                className="size-12 shrink-0 object-contain"
              />
            </div>

            <p className="mt-7 max-w-2xl font-display text-[clamp(1.875rem,3.5vw+1rem,3rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance">
              {tSite("name")}
            </p>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/55">
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
    </footer>
  );
}
