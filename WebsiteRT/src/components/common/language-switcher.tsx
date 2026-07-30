"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Switches locale while staying on the current page.
 *
 * `router.replace` with the same pathname re-resolves it under the new locale,
 * so dynamic routes (`/fellowships/[slug]`) keep their params.
 */
export function LanguageSwitcher({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "onDark";
}) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onDark = tone === "onDark";

  function switchTo(next: Locale) {
    if (next === locale) return;

    startTransition(() => {
      router.replace(
        // @ts-expect-error -- pathname is a known route; params satisfy it.
        { pathname, params },
        { locale: next },
      );
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
      <Globe
        aria-hidden
        className={cn(
          "ml-1 size-3 shrink-0",
          onDark ? "text-white/70" : "text-[var(--muted-foreground)]",
        )}
      />

      {locales.map((code) => {
        const isActive = code === locale;

        return (
          <button
            key={code}
            type="button"
            data-lang-switch
            onClick={() => switchTo(code)}
            aria-current={isActive ? "true" : undefined}
            disabled={isPending}
            className={cn(
              /*
               * `py-1 leading-4` is deliberate rather than tighter: it holds
               * each button at a 24px box, the WCAG 2.2 minimum target size.
               * The pill shrinks by trimming the padding and type around that
               * floor, not by going under it.
               */
              "rounded-full px-2 py-1 text-[0.6875rem] font-medium leading-4 transition-colors",
              isActive
                ? onDark
                  ? "bg-white text-sand-900"
                  : "bg-[var(--primary)] text-white"
                : onDark
                  ? "text-white/80 hover:bg-white/15"
                  : "text-[var(--muted-foreground)] hover:bg-sand-100",
            )}
          >
            <span className="sr-only">{localeLabels[code]}</span>
            <span aria-hidden>{code === "en" ? "EN" : "தமிழ்"}</span>
          </button>
        );
      })}
    </div>
  );
}
