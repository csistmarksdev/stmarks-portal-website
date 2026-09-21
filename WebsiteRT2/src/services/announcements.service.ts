import { ANNOUNCEMENTS } from "@/data/announcements.mock";
import type { Announcement, FellowshipSlug } from "@/types/content";

import { apiGet } from "./http";

/** Pinned announcements float to the top, then newest first. */
const byPinnedThenDate = (a: Announcement, b: Announcement) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
};

const TAGS = ["announcements"];

export function getAnnouncements(limit?: number): Promise<Announcement[]> {
  return apiGet<Announcement[]>("/announcements", {
    params: { limit },
    tags: TAGS,
    fallback: () => {
      const sorted = [...ANNOUNCEMENTS].sort(byPinnedThenDate);
      return limit ? sorted.slice(0, limit) : sorted;
    },
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
  });
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
  });
}
