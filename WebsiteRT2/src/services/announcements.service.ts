import { ANNOUNCEMENTS } from "@/data/announcements.mock";
import type { Announcement, FellowshipSlug } from "@/types/content";

import { isPublishable } from "./guards";
import { apiGet } from "./http";

/** F-003: the "Sample"/"மாதிரி" notice and any like it never render. */
const clean = (items: Announcement[]) => items.filter(isPublishable);

/** Pinned announcements float to the top, then newest first. */
const byPinnedThenDate = (a: Announcement, b: Announcement) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
};

const TAGS = ["announcements"];

export function getAnnouncements(limit?: number): Promise<Announcement[]> {
  return apiGet<Announcement[]>("/announcements", {
    params: { limit: limit ? limit + 3 : undefined },
    tags: TAGS,
    fallback: () => [...ANNOUNCEMENTS].sort(byPinnedThenDate),
  }).then((items) => {
    const kept = clean(items);
    return limit ? kept.slice(0, limit) : kept;
  });
}

/**
 * The endpoint returns `null` (not a 404) when nothing is pinned, so this is a
 * plain `apiGet` - a null body is a valid answer here, not a missing record.
 */
export function getPinnedAnnouncement(): Promise<Announcement | null> {
  return apiGet<Announcement | null>("/announcements/pinned", {
    tags: TAGS,
    fallback: () => ANNOUNCEMENTS.find((a) => a.pinned) ?? null,
  }).then((item) => (item && isPublishable(item) ? item : null));
}

export function getAnnouncementsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<Announcement[]> {
  return apiGet<Announcement[]>("/announcements", {
    params: { fellowship: fellowshipSlug },
    tags: TAGS,
    fallback: () =>
      ANNOUNCEMENTS.filter((a) => a.fellowshipSlug === fellowshipSlug).sort(
        byPinnedThenDate,
      ),
  }).then(clean);
}
