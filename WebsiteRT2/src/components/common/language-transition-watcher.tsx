"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

import type { Locale } from "@/i18n/routing";
import { completeLanguageTransition } from "@/lib/language-transition";

/**
 * Lowers the language-change curtain (see `lib/language-transition.ts`) once
 * the page has committed in the new language. An effect runs after React has
 * put the new tree on screen, so the curtain lifts on the finished page, never
 * on the old one.
 */
export function LanguageTransitionWatcher() {
  const locale = useLocale() as Locale;
  useEffect(() => {
    completeLanguageTransition(locale);
  }, [locale]);
  return null;
}
