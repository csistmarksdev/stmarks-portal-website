import { DOWNLOADS } from "@/data/downloads.mock";
import type {
  DownloadCategory,
  DownloadFile,
  FellowshipSlug,
} from "@/types/content";

import { apiGet } from "./http";

const newestFirst = (a: DownloadFile, b: DownloadFile) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

const TAGS = ["downloads"];

export function getDownloads(): Promise<DownloadFile[]> {
  return apiGet<DownloadFile[]>("/downloads", {
    tags: TAGS,
    fallback: () => [...DOWNLOADS].sort(newestFirst),
  });
}

export function getDownloadsByCategory(
  category: DownloadCategory,
): Promise<DownloadFile[]> {
  return apiGet<DownloadFile[]>("/downloads", {
    params: { category },
    tags: TAGS,
    fallback: () =>
      DOWNLOADS.filter((d) => d.category === category).sort(newestFirst),
  });
}

/**
 * All categories at once, so the page makes a single call - the API groups
 * them server-side rather than the page fetching three times.
 */
export function getDownloadsGrouped(): Promise<
  Record<DownloadCategory, DownloadFile[]>
> {
  return apiGet<Record<DownloadCategory, DownloadFile[]>>("/downloads/grouped", {
    tags: TAGS,
    fallback: () => {
      const all = [...DOWNLOADS].sort(newestFirst);
      return {
        bulletin: all.filter((d) => d.category === "bulletin"),
        form: all.filter((d) => d.category === "form"),
        document: all.filter((d) => d.category === "document"),
      };
    },
  });
}

export function getDownloadsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<DownloadFile[]> {
  return apiGet<DownloadFile[]>("/downloads", {
    params: { fellowship: fellowshipSlug },
    tags: TAGS,
    fallback: () =>
      DOWNLOADS.filter((d) => d.fellowshipSlug === fellowshipSlug).sort(
        newestFirst,
      ),
  });
}
