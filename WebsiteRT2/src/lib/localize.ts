import { defaultLocale, type Locale } from "@/i18n/routing";
import type { LocalizedText, LocalizedTextOptional } from "@/types/common";

/**
 * Resolve a localized content field for the active locale.
 *
 * Falls back to the default locale when a translation is missing, so a
 * partially-translated CMS record still renders instead of showing a blank.
 */
export function localize(
  field: LocalizedText | LocalizedTextOptional | undefined,
  locale: Locale,
): string {
  if (!field) return "";
  return field[locale] ?? field[defaultLocale] ?? "";
}

/** Resolve a list of localized fields in one call. */
export function localizeAll(
  fields: readonly LocalizedText[] | undefined,
  locale: Locale,
): string[] {
  if (!fields) return [];
  return fields.map((field) => localize(field, locale));
}
