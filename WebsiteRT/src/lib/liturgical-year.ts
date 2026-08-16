/**
 * The church year, as the Church of South India keeps it.
 *
 * Everything a church does is dated from two points: Christmas, which is fixed
 * to the 25th of December, and Easter, which is fixed to nothing — it is the
 * Sunday after the first full moon on or after the vernal equinox, which is why
 * Lent, Good Friday, Ascension and Pentecost all move by up to five weeks from
 * one year to the next.
 *
 * So the site cannot carry a table of dates. It has to calculate the year the
 * way the church does, from Easter outward, and then ask what today is. That is
 * all this module does: dates in, season out. No React, no DOM, no styling
 * opinions — those live in `components/common/liturgical-season.tsx` and in the
 * season blocks of `globals.css`.
 *
 * ## Why this is the CSI calendar and not a generic one
 *
 * The CSI is a united church — Anglican, Methodist, Congregational,
 * Presbyterian and Reformed traditions joined in 1947 — in full communion with
 * the Anglican Communion, and its *Book of Common Worship* keeps the Western
 * calendar and the Revised Common Lectionary. So:
 *
 * - The **Gregorian computus** below is the correct one. An Orthodox parish
 *   would need the Julian variant, which can put Easter five weeks later.
 * - **Lent is forty days plus Sundays**, counted back from Easter to Ash
 *   Wednesday — the Western reckoning, not the Eastern Great Lent.
 * - **Pentecost closes Eastertide on the fiftieth day**, and the long green
 *   stretch after it is ordinary time rather than a numbered Trinity season.
 * - **CSI Day, the 27th of September**, is in here and would be in no other
 *   church's calendar: the date in 1947 when the CSI was inaugurated in St
 *   George's Cathedral, Madras. It is the one observance on this list that
 *   belongs to this communion alone, and a CSI congregation keeps it.
 *
 * The colours the seasons are dressed in follow the CSI BCW's own sequence —
 * violet through Advent and Lent, white and gold at Christmas and Easter, red
 * at Pentecost, green in ordinary time, and Good Friday stripped bare. They are
 * stated in the season blocks of `globals.css`, where they are actually
 * applied.
 */

/**
 * The seasons the site dresses for.
 *
 * Deliberately shorter than a full lectionary, and shorter again than the first
 * version of this file: Advent, Epiphany and Pentecost were kept here and are
 * not any more. They remain in the church's calendar, of course — this is a
 * list of the days the *website* changes its clothes for, not a statement about
 * what the parish observes.
 *
 * One consequence worth recording, because it is not obvious: with Advent gone,
 * Christmas is what carries December. It runs **1 December to 1 January** here,
 * which is neither of the liturgical boundaries — Christmastide proper is the
 * twelve days from the 25th to Twelfth Night. It opens early because the month
 * of waiting has to be dressed for by something, and it closes on New Year's
 * Day because that is when decorations actually come down. Both departures are
 * deliberate; see `getSeason` below.
 */
export type Season =
  | "christmas"
  | "ash-wednesday"
  | "lent"
  | "holy-week"
  | "good-friday"
  | "easter"
  | "csi-day"
  | "ordinary";

export const SEASONS: readonly Season[] = [
  "christmas",
  "ash-wednesday",
  "lent",
  "holy-week",
  "good-friday",
  "easter",
  "csi-day",
  "ordinary",
];

/**
 * CSI Day — the 27th of September.
 *
 * The Church of South India was inaugurated in St George's Cathedral, Madras,
 * on the 27th of September 1947: four traditions that had been separate
 * churches walked in and one church walked out. Every CSI congregation keeps
 * the day, and no other communion has it in its calendar.
 *
 * Fixed to the date rather than to the nearest Sunday, because that is how the
 * date is named and remembered.
 */
const CSI_DAY = { month: 9, date: 27 };

/** A calendar day with no time and no zone — the only unit this file deals in. */
type Day = { year: number; month: number; date: number };

/** Days since an arbitrary epoch, so two days can be compared and offset. */
function toOrdinal({ year, month, date }: Day): number {
  return Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
}

/**
 * Easter Sunday, by the anonymous Gregorian computus.
 *
 * Also called the Meeus/Jones/Butcher algorithm. It is presented without
 * derivation in every source that carries it, including this one — the working
 * is a page of modular arithmetic reconciling the 19-year Metonic lunar cycle
 * with the Gregorian leap rule and its century corrections. The variable names
 * are the traditional ones precisely so that the code can be checked against
 * any published statement of it, letter for letter.
 *
 * Verified against the published dates: 2024-03-31, 2025-04-20, 2026-04-05,
 * 2027-03-28, 2030-04-21, 2038-04-25 (the latest Easter can fall).
 */
export function easterSunday(year: number): Day {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;

  return { year, month, date };
}

/**
 * What season a given day falls in.
 *
 * Ordered by precedence rather than by the calendar: Good Friday is inside Holy
 * Week, which is inside Lent, and each has to be answered before the season
 * that contains it.
 */
export function getSeason(date: Date): Season {
  const today = toOrdinal({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    date: date.getDate(),
  });

  const year = date.getFullYear();
  const easter = toOrdinal(easterSunday(year));

  /* Good Friday. One day, and the only one the site strips itself for. */
  if (today === easter - 2) return "good-friday";

  /* Palm Sunday through Holy Saturday — Good Friday already answered above. */
  if (today >= easter - 7 && today < easter) return "holy-week";

  /*
   * Ash Wednesday — the first day of Lent, and dressed for separately.
   *
   * Tested before the Lent range that contains it, for the same reason Good
   * Friday is tested before Holy Week: these seasons nest, and a day inside a
   * range can only win if it is asked about first.
   *
   * It is 46 days before Easter — forty days of Lent, plus the six Sundays
   * inside it, which are not counted because a Sunday is never a fast.
   */
  if (today === easter - 46) return "ash-wednesday";

  /* The rest of Lent: the day after Ash Wednesday to the eve of Palm Sunday. */
  if (today > easter - 46 && today < easter - 7) return "lent";

  /* Eastertide runs to Pentecost, the fiftieth day counting Easter as the
     first. Pentecost is no longer dressed for separately, so the season simply
     closes on it rather than handing over. */
  if (today >= easter && today <= easter + 49) return "easter";

  /*
   * Christmas: the whole of December, and New Year's Day.
   *
   * Two tests rather than one range because the season crosses the new year —
   * on the 1st of January the December in question is the *previous* year's,
   * and an ordinal comparison against `year` would look for a December that has
   * not happened yet.
   *
   * Neither boundary is the liturgical one, and both are deliberate. It opens
   * on the 1st rather than the 25th because Advent is not dressed for
   * separately here, so Christmas has to carry the month the congregation
   * actually spends waiting. It closes on the 1st of January rather than at
   * Twelfth Night on the 5th because that is where the decorations come down in
   * practice — the site should not still be hung with baubles in the week
   * everyone has gone back to work.
   */
  if (today >= toOrdinal({ year, month: 12, date: 1 })) return "christmas";
  if (today <= toOrdinal({ year, month: 1, date: 1 })) return "christmas";

  /*
   * CSI Day. Last of the tests rather than first: it is a fixed date in late
   * September, which is always ordinary time in the Western calendar, so it can
   * never collide with a moveable season and never needs to win one.
   */
  if (today === toOrdinal({ year, ...CSI_DAY })) return "csi-day";

  return "ordinary";
}

/**
 * Whether the season carries the snow and the decorations.
 *
 * Christmas, and only Christmas — 1 December through New Year's Day. The snow,
 * the garland, the treeline in every section and the frieze at the foot of the
 * page all key off this one answer, so they arrive together and leave together
 * and no single piece of it can be left hanging into January on its own.
 */
export function isSnowSeason(season: Season): boolean {
  return season === "christmas";
}

/**
 * Whether the season carries the bare-branch decorations.
 *
 * Lent and Holy Week — and pointedly **not** Good Friday, which sits inside
 * both, nor **Ash Wednesday**, which has a scene and a row of its own.
 *
 * Ash Wednesday was briefly included here, and it caused exactly the bug that
 * inclusion invites: the Lenten scene and the Ash Wednesday scene both rendered
 * at the foot of the page, so the day carried two scriptures — Genesis 3:19
 * above Joel 2:12 — and two sets of figures. Every call site then had to
 * exclude it again by hand, which is the signal that the predicate was wrong
 * rather than the call sites. A day that is dressed for separately does not
 * belong in the predicate for the season around it. On that one day the church strips its own altar, so the site carries
 * nothing at all: no branches, no scene, no verse at the foot of the page. A
 * decoration that survived Good Friday would be the one that proved none of
 * this was ever really keeping the calendar.
 */
export function isLentSeason(season: Season): boolean {
  return season === "lent" || season === "holy-week";
}

/** Type guard for the `?season=` preview parameter. */
export function isSeason(value: string | null): value is Season {
  return value !== null && (SEASONS as readonly string[]).includes(value);
}
