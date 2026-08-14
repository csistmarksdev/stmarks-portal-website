import type { FellowshipSlug } from "@/types/content";

import { ROUTES } from "./site";

/**
 * Navigation model shared by the desktop menu, mobile drawer and footer.
 *
 * `labelKey` is a path into the `nav` namespace of the message files — never
 * a display string, so the menu translates automatically.
 */
export interface NavChild {
  labelKey: string;
  href: string;
}

export interface NavItem {
  labelKey: string;
  href: string;
  children?: NavChild[];
}

/**
 * Every fellowship, in the order the church lists them, against its label key.
 *
 * Typed as a `Record` over the slug union rather than written out as a menu:
 * adding a fellowship to `FellowshipSlug` now fails the build here until it is
 * given a label, and a slug that no longer exists fails too. The menu below is
 * generated from this, so it cannot drift from the content model the way a
 * hand-maintained list of eight `<li>`s could.
 */
const FELLOWSHIP_LABEL_KEYS: Record<FellowshipSlug, string> = {
  "youth-fellowship": "fellowshipItems.youth",
  "young-couple-fellowship": "fellowshipItems.youngCouple",
  "sunday-school": "fellowshipItems.sundaySchool",
  choir: "fellowshipItems.choir",
  "womens-fellowship": "fellowshipItems.women",
  "mens-fellowship": "fellowshipItems.men",
  "prayer-fellowship": "fellowshipItems.prayer",
  "other-fellowships": "fellowshipItems.other",
};

/**
 * Menu order is the declaration order above — one literal is the single source
 * of both the set and its sequence, so there is no second array to fall out of
 * step with it.
 */
export const FELLOWSHIP_SLUGS = Object.keys(
  FELLOWSHIP_LABEL_KEYS,
) as FellowshipSlug[];

/**
 * The fellowships submenu, optionally narrowed to the slugs that actually
 * exist. Passing the live set keeps the menu from advertising a page the site
 * never built; passing nothing lists them all.
 */
export function fellowshipNavChildren(
  available?: readonly FellowshipSlug[],
): NavChild[] {
  const slugs = available?.length
    ? FELLOWSHIP_SLUGS.filter((slug) => available.includes(slug))
    : FELLOWSHIP_SLUGS;

  return slugs.map((slug) => ({
    labelKey: FELLOWSHIP_LABEL_KEYS[slug],
    href: ROUTES.fellowship(slug),
  }));
}

export const MAIN_NAV: NavItem[] = [
  // No "Home" item — the wordmark links home, so it would be redundant.
  {
    labelKey: "about",
    href: ROUTES.about,
    children: [
      { labelKey: "aboutItems.history", href: `${ROUTES.about}#history` },
      {
        labelKey: "aboutItems.visionMission",
        href: `${ROUTES.about}#vision-mission`,
      },
      { labelKey: "aboutItems.diocese", href: `${ROUTES.about}#diocese` },
      {
        labelKey: "aboutItems.serviceTimings",
        href: `${ROUTES.about}#service-timings`,
      },
      { labelKey: "aboutItems.contact", href: `${ROUTES.about}#contact` },
    ],
  },
  {
    labelKey: "leadership",
    href: ROUTES.leadership,
    children: [
      {
        labelKey: "leadershipItems.currentPastors",
        href: `${ROUTES.leadership}#current-pastors`,
      },
      {
        labelKey: "leadershipItems.assistantPastors",
        href: `${ROUTES.leadership}#assistant-pastors`,
      },
      {
        labelKey: "leadershipItems.committee",
        href: `${ROUTES.leadership}#committee`,
      },
      {
        labelKey: "leadershipItems.presbyters",
        href: `${ROUTES.leadership}#presbyters`,
      },
    ],
  },
  {
    labelKey: "fellowships",
    href: ROUTES.fellowships,
    children: fellowshipNavChildren(),
  },
  {
    labelKey: "events",
    href: ROUTES.events,
    children: [
      { labelKey: "eventsItems.upcoming", href: `${ROUTES.events}#upcoming` },
      { labelKey: "eventsItems.past", href: `${ROUTES.events}#past` },
      { labelKey: "eventsItems.blog", href: ROUTES.blog },
    ],
  },
  { labelKey: "gallery", href: ROUTES.gallery },
  { labelKey: "announcements", href: ROUTES.announcements },
  { labelKey: "downloads", href: ROUTES.downloads },
  { labelKey: "contact", href: ROUTES.contact },
];

/** A trimmed set for the footer's quick-links column. */
export const FOOTER_QUICK_LINKS: NavChild[] = [
  { labelKey: "about", href: ROUTES.about },
  { labelKey: "leadership", href: ROUTES.leadership },
  { labelKey: "fellowships", href: ROUTES.fellowships },
  { labelKey: "events", href: ROUTES.events },
  { labelKey: "gallery", href: ROUTES.gallery },
  { labelKey: "announcements", href: ROUTES.announcements },
  { labelKey: "downloads", href: ROUTES.downloads },
  { labelKey: "contact", href: ROUTES.contact },
];
