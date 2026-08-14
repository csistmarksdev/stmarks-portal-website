"use client";

import { useEffect, useSyncExternalStore } from "react";

import { getSeason, isSeason, type Season } from "@/lib/liturgical-year";

/**
 * Dresses the site for the season.
 *
 * A church changes with its year — the frontals, the flowers, the light, and on
 * one day of it, nothing at all. This does the same thing in the only way a
 * website honestly can: it puts the current season on the root element, and the
 * season blocks at the foot of `globals.css` retune four custom properties from
 * there. Nothing here knows what a colour is; nothing there knows what a
 * calendar is.
 *
 * What actually changes is deliberately small — the light falling into a
 * section, the colour of the cross that heads it, and the temperature of the
 * paper. No bunting, no icons, no swapped photography. A congregation walking
 * into their own church in Lent does not find a different building; they find
 * the same one, quieter and barer, and they know immediately.
 */

/**
 * The resolved season, decided once per page load.
 *
 * Cached at module scope because `useSyncExternalStore` requires a snapshot
 * that is stable between calls. Nothing that feeds it can change within a load:
 * the URL is fixed for the life of the document, and a reader is not going to
 * be sitting on the page at midnight on Holy Saturday — and if they are, the
 * next navigation picks it up.
 */
let resolved: Season | null = null;

function currentSeason(): Season {
  if (resolved !== null) return resolved;

  /*
   * `?season=` — the preview switch, mirroring `?snow` on the snowfall.
   *
   *   ?season=lent           ?season=good-friday      ?season=easter
   *   ?season=advent         ?season=christmas        ?season=epiphany
   *   ?season=holy-week      ?season=pentecost        ?season=ordinary
   *
   * Without it, Good Friday is visible for one day a year and Lent for six
   * weeks, and the first person to see either would be the congregation. An
   * unrecognised value is ignored rather than honoured, so a typo shows the
   * real season instead of silently stripping the site on an ordinary Tuesday.
   */
  const asked = new URLSearchParams(window.location.search).get("season");

  resolved = isSeason(asked) ? asked : getSeason(new Date());

  return resolved;
}

/** Nothing to subscribe to: the answer is fixed for the life of the page. */
const NEVER_CHANGES = () => () => {};

/**
 * The season, for any client component that needs to know — the snowfall reads
 * it rather than counting months of its own, so the two can never disagree
 * about what day it is.
 *
 * `"ordinary"` on the server: the season is a fact about the reader's clock and
 * the page's URL, and every page here is statically prerendered. Ordinary time
 * is the right default in every sense — it is the state of the church year for
 * about half of it, and it is what the site's own tokens already describe.
 */
export function useLiturgicalSeason(): Season {
  return useSyncExternalStore(
    NEVER_CHANGES,
    currentSeason,
    () => "ordinary" as const,
  );
}

export function LiturgicalSeason() {
  const season = useLiturgicalSeason();

  /*
   * Written to the root element rather than rendered as a wrapper.
   *
   * The season has to reach the fixed masthead, the dialogs, the splash screen
   * and the `::selection` colour — none of which sit inside any component's
   * subtree. `data-season` on `<html>` is the one place CSS can see all of them
   * from, and it costs a single attribute write per load.
   *
   * The frame of ordinary palette before this lands is covered by the splash
   * screen, which is still up: the site's first paint is a white field with the
   * crest on it, and the season is in place well before that clears.
   */
  useEffect(() => {
    document.documentElement.dataset.season = season;
  }, [season]);

  return null;
}
