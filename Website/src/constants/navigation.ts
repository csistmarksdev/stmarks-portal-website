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
        labelKey: "leadershipItems.formerPastors",
        href: `${ROUTES.leadership}#former-pastors`,
      },
    ],
  },
  {
    labelKey: "fellowships",
    href: ROUTES.fellowships,
    children: [
      {
        labelKey: "fellowshipItems.youth",
        href: ROUTES.fellowship("youth-fellowship"),
      },
      {
        labelKey: "fellowshipItems.youngCouple",
        href: ROUTES.fellowship("young-couple-fellowship"),
      },
      {
        labelKey: "fellowshipItems.sundaySchool",
        href: ROUTES.fellowship("sunday-school"),
      },
      { labelKey: "fellowshipItems.choir", href: ROUTES.fellowship("choir") },
      {
        labelKey: "fellowshipItems.women",
        href: ROUTES.fellowship("womens-fellowship"),
      },
      {
        labelKey: "fellowshipItems.men",
        href: ROUTES.fellowship("mens-fellowship"),
      },
      {
        labelKey: "fellowshipItems.prayer",
        href: ROUTES.fellowship("prayer-fellowship"),
      },
      {
        labelKey: "fellowshipItems.other",
        href: ROUTES.fellowship("other-fellowships"),
      },
    ],
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
