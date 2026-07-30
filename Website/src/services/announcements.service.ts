import { ANNOUNCEMENTS } from "@/data/announcements.mock";
import type { Announcement, FellowshipSlug } from "@/types/content";

import { mockResponse } from "./http";

/** Pinned announcements float to the top, then newest first. */
const byPinnedThenDate = (a: Announcement, b: Announcement) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
};

export function getAnnouncements(limit?: number): Promise<Announcement[]> {
  const sorted = [...ANNOUNCEMENTS].sort(byPinnedThenDate);
  return mockResponse(limit ? sorted.slice(0, limit) : sorted);
}

export function getPinnedAnnouncement(): Promise<Announcement | null> {
  return mockResponse(ANNOUNCEMENTS.find((a) => a.pinned) ?? null);
}

export function getAnnouncementsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<Announcement[]> {
  return mockResponse(
    ANNOUNCEMENTS.filter((a) => a.fellowshipSlug === fellowshipSlug).sort(
      byPinnedThenDate,
    ),
  );
}
