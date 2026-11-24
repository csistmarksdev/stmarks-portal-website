import { BadRequestException } from "@nestjs/common";

/**
 * Content checks applied when a record is saved (F-003, F-005).
 */

/* -------------------------------------------------------------------------- */
/* F-003 — placeholder content must not be published                          */
/* -------------------------------------------------------------------------- */

const PLACEHOLDER_WORDS = [
  "sample",
  "demo",
  "test",
  "lorem",
  "ipsum",
  "placeholder",
  "dummy",
];

/**
 * Whole-word, case-insensitive. "Word" boundaries are any non letter/number
 * character, so `sample-harvest-festival` and `DEMO — replace…` match while
 * `testimony`, `contest` and `demonstration` do not.
 */
const PLACEHOLDER_PATTERN = new RegExp(
  `(?:^|[^\\p{L}\\p{N}])(${PLACEHOLDER_WORDS.join("|")})(?=$|[^\\p{L}\\p{N}])`,
  "iu",
);

/** Tamil "sample" — matched as a substring, since Tamil words inflect. */
const TAMIL_SAMPLE = "மாதிரி";

/** Returns the offending word in `text`, or null when it is clean. */
export function findPlaceholder(text: string | undefined | null): string | null {
  if (typeof text !== "string" || !text) return null;
  if (text.includes(TAMIL_SAMPLE)) return TAMIL_SAMPLE;
  const match = PLACEHOLDER_PATTERN.exec(text);
  return match ? match[1] : null;
}

const LOCALES = ["en", "ta"] as const;

export type Localized = { en?: string; ta?: string } | undefined | null;

export interface PlaceholderCheckInput {
  /** What the admin calls this kind of record, e.g. "announcement". */
  kind: string;
  slug?: string;
  title?: Localized;
  /** Extra localized fields to check, labelled for the error message. */
  extra?: Array<{ label: string; value: Localized }>;
}

/**
 * Throws 400 when a record about to be *published* still carries placeholder
 * text in its slug, title (any language) or the extra fields given. Callers
 * only invoke this when the resulting status is "published" — drafts may
 * contain anything.
 */
export function assertNoPlaceholderContent(input: PlaceholderCheckInput): void {
  const fields: Array<{ label: string; value: string | undefined }> = [];
  if (input.slug) fields.push({ label: "slug", value: input.slug });
  const addLocalized = (label: string, value: Localized) => {
    if (!value) return;
    // Read the locales by name: `value` may be a Mongoose subdocument, whose
    // own enumerable keys are internals rather than the languages.
    for (const locale of LOCALES) {
      const text = value[locale];
      if (typeof text === "string") {
        fields.push({ label: `${label} (${locale})`, value: text });
      }
    }
  };
  addLocalized("title", input.title);
  for (const extra of input.extra ?? []) addLocalized(extra.label, extra.value);

  const hits = fields
    .map(({ label, value }) => ({ label, word: findPlaceholder(value), value }))
    .filter((hit) => hit.word !== null);
  if (hits.length === 0) return;

  const detail = hits
    .map((hit) => `${hit.label} "${hit.value}" contains "${hit.word}"`)
    .join("; ");
  throw new BadRequestException(
    `This ${input.kind} looks like placeholder content and cannot be published: ${detail}. ` +
      "Replace the placeholder text, or save it as a draft.",
  );
}

/* -------------------------------------------------------------------------- */
/* F-005 — the year in an event's slug must match its date                    */
/* -------------------------------------------------------------------------- */

const CHURCH_TIME_ZONE = "Asia/Kolkata";

/** 4-digit years (19xx/20xx) appearing as whole dash-separated slug tokens. */
export function yearsInSlug(slug: string): number[] {
  return slug
    .split("-")
    .filter((token) => /^(19|20)\d{2}$/.test(token))
    .map(Number);
}

/** Calendar year of `date` as the church experiences it (Asia/Kolkata). */
export function churchYear(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: CHURCH_TIME_ZONE, year: "numeric" }).format(
      date,
    ),
  );
}

/**
 * When an event moves to another year, the year in its slug moves with it:
 * `womens-fellowship-day-2026` dated 11 Oct 2027 becomes
 * `womens-fellowship-day-2027`. Returns null when the slug has no year, or
 * already names the event's year — nothing to move.
 */
export function retargetSlugYear(slug: string, startDate: Date): string | null {
  const years = yearsInSlug(slug);
  if (years.length === 0) return null;
  const actual = churchYear(startDate);
  if (years.includes(actual)) return null;
  return slug
    .split("-")
    .map((token) => (/^(19|20)\d{2}$/.test(token) ? String(actual) : token))
    .join("-");
}

/**
 * Rejects an event whose slug names a year that its start date does not fall
 * in — e.g. `womens-fellowship-day-2026` stored as 11 Oct 2027. Passes when
 * the slug has no year token, or when any of its year tokens matches.
 */
export function assertSlugYearMatchesDate(slug: string, startDate: Date): void {
  const years = yearsInSlug(slug);
  if (years.length === 0) return;
  const actual = churchYear(startDate);
  if (years.includes(actual)) return;

  const shown = new Intl.DateTimeFormat("en-GB", {
    timeZone: CHURCH_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(startDate);
  throw new BadRequestException(
    `The event's slug "${slug}" says ${years.join("/")}, but its start date is ${shown} (${actual}, India time). ` +
      "Correct the start date, or change the title/slug so the year matches.",
  );
}
