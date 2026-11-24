"use client";

import { Globe } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition, type MouseEvent } from "react";

import { getPathname, usePathname } from "@/i18n/navigation";
import {
  defaultLocale,
  localeLabels,
  localeShortLabels,
  locales,
  type Locale,
} from "@/i18n/routing";
import { beginLanguageTransition } from "@/lib/language-transition";
import { cn } from "@/lib/utils";

/**
 * The site's own language first.
 *
 * Derived rather than reordered by hand: `locales` is also the array
 * `defineRouting` is built from, and its order matters to nothing else. Sorting
 * here means the control follows `defaultLocale` on its own if the church ever
 * changes which language leads.
 */
const ORDERED_LOCALES: readonly Locale[] = [
  defaultLocale,
  ...locales.filter((code) => code !== defaultLocale),
];

/**
 * The language control: one real link per language, each to this same page in
 * that language (F-021).
 *
 * It used to be two `<button>`s calling `router.replace`, which had four costs.
 * A crawler saw no link between the two language versions of any page. The
 * `#fragment` was dropped, so switching language from the service-timings
 * block threw the reader back to the top of the page. Nothing carried `lang`,
 * so a screen reader read "தமிழ்" with an English voice. And the targets were
 * 24px.
 *
 * Now each option is an `<a href>` to the twin URL - resolved with
 * `getPathname` rather than next-intl's `Link locale=...`, because that forces
 * a prefix when it changes locale, and the Tamil twin of `/en/x` would have
 * been `/ta/x`: a redirect, not the canonical address a crawler should be
 * handed. `hrefLang` names the language of the destination, `lang` the
 * language of the label. The query and fragment are not part of the rendered
 * href (reading the query during render would need `useSearchParams`, which
 * opts the route out of static rendering); they are appended at click time,
 * where the address bar is the source of truth anyway.
 *
 * Every option is at least 44x44px to the pointer. The visible pill is drawn
 * smaller so it still sits in the header bar beside 34px controls; the
 * difference is made up by an invisible `::after` that belongs to the link and
 * so takes its clicks.
 */
export function LanguageSwitcher({
  className,
  tone = "default",
  labels = "full",
}: {
  className?: string;
  tone?: "default" | "onDark";
  /**
   * `short` draws each option as its abbreviation - த / EN - for the header
   * bar, where the full names crowd the row; the full name is still what a
   * screen reader announces and what the tooltip says. `full` spells them
   * out, for the menu, where there is room.
   */
  labels?: "full" | "short";
}) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onDark = tone === "onDark";

  function onSwitch(event: MouseEvent<HTMLAnchorElement>, next: Locale) {
    // The current language: nothing to switch to, and no reload either.
    if (next === locale) {
      event.preventDefault();
      return;
    }

    const href =
      getPathname({ href: pathname, locale: next }) +
      window.location.search +
      window.location.hash;

    // New tab, new window: let the browser have it, but with the query and
    // fragment on the address it opens.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      event.currentTarget.href = href;
      return;
    }

    event.preventDefault();
    // The curtain goes up first, so the page under it can change in one go.
    beginLanguageTransition(next);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border p-0.5",
        onDark ? "border-white/25 bg-white/10" : "border-[var(--border)]",
        isPending && "opacity-60",
        className,
      )}
      role="group"
      aria-label={t("changeLanguage")}
    >
      {/* The short pill speaks for itself - த / EN is the language control -
          so the globe is kept for the spelled-out one only. */}
      {labels === "full" ? (
        <Globe
          aria-hidden
          className={cn(
            "ml-1 hidden size-3 shrink-0 sm:block",
            onDark ? "text-white/70" : "text-[var(--muted-foreground)]",
          )}
        />
      ) : null}

      {ORDERED_LOCALES.map((code) => {
        const isActive = code === locale;
        const label = localeLabels[code];
        const short = labels === "short";

        return (
          <NextLink
            key={code}
            href={getPathname({ href: pathname, locale: code })}
            hrefLang={code}
            prefetch={false}
            data-lang-switch
            onClick={(event) => onSwitch(event, code)}
            aria-current={isActive ? "true" : undefined}
            title={
              isActive
                ? short
                  ? label
                  : undefined
                : t("switchToLanguage", { language: label })
            }
            className={cn(
              // A 28px pill with a 44px-tall hit area centred on it: the
              // `after:` box is part of the link, so it takes the clicks.
              // `min-w-11` keeps the width at 44px for a short label.
              "relative inline-flex h-7 items-center justify-center rounded-full text-xs font-medium leading-none transition-[color,background-color,box-shadow] duration-200",
              // Short: a fixed 32px button per language. Full: room for the name.
              short ? "w-8" : "min-w-11 px-2.5",
              "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
              isActive
                ? onDark
                  ? "bg-white text-sand-900"
                  : "bg-[var(--primary)] text-white"
                : onDark
                  ? "text-white/85 hover:bg-white/15"
                  : "text-[var(--muted-foreground)] hover:bg-sand-100 hover:text-[var(--foreground)]",
            )}
          >
            {short ? (
              <span lang={code}>
                {/* Each abbreviation in its own script's face: on a Tamil page
                    "EN" otherwise came from Noto Sans Tamil's Latin, which sits
                    higher than Inter's and visibly off the த beside it. */}
                <span
                  aria-hidden
                  className="block leading-none"
                  style={{ fontFamily: code === "ta" ? "var(--font-noto-tamil)" : "var(--font-inter)" }}
                >
                  {localeShortLabels[code]}
                </span>
                <span className="sr-only">{label}</span>
              </span>
            ) : (
              <span lang={code}>{label}</span>
            )}
          </NextLink>
        );
      })}
    </div>
  );
}
