import type { Season } from "@/lib/liturgical-year";

/**
 * A verse for each season of the church year.
 *
 * The site already changes its light and its colour with the calendar. This is
 * the same idea carried one step further, into words: what the church would
 * actually have on its lips at this point in the year.
 *
 * The verses are chosen against a second constraint as well, which is why these
 * eight and not eight others. They are read on the pages where something has
 * gone wrong - a path that leads nowhere, a page that failed to load - so each
 * one had to speak to *that* moment too, not only to its season. Hence Isaiah
 * in Lent ("seek the LORD while he may be found") and Luke at Easter ("why do
 * you seek the living among the dead?"): both are the season's own text, and
 * both are about looking for something in the wrong place, which is exactly
 * what the reader has just done.
 *
 * Good Friday is the one that had to be handled carefully. The season strips
 * the site to grey, and the obvious verse for the day - "my God, my God, why
 * have you forsaken me" - would leave a lost visitor with nothing to hold. The
 * Lamentations text is still the day's own key, still unmistakably Good Friday,
 * and it ends on mercy rather than abandonment.
 *
 * The text itself lives in `messages/*.json`, not here, so the church can
 * correct a rendering without a code change. This module only says which verse
 * belongs to which season.
 */

/**
 * Season to message key.
 *
 * The seasons are hyphenated (`ash-wednesday`) and the message namespaces are
 * camelCase (`ashWednesday`), following the `season.*` keys already in the
 * message files. Written out rather than derived, so a new season added to the
 * calendar fails at the type level here instead of silently resolving to a
 * missing translation at runtime.
 */
const SCRIPTURE_KEYS = {
  christmas: "christmas",
  "ash-wednesday": "ashWednesday",
  lent: "lent",
  "holy-week": "holyWeek",
  "good-friday": "goodFriday",
  easter: "easter",
  "csi-day": "csiDay",
  ordinary: "ordinary",
} as const satisfies Record<Season, string>;

export type ScriptureKey = (typeof SCRIPTURE_KEYS)[Season];

/** The `scripture.*` message key carrying this season's verse. */
export function scriptureKey(season: Season): ScriptureKey {
  return SCRIPTURE_KEYS[season];
}
