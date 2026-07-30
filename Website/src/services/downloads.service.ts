import { DOWNLOADS } from "@/data/downloads.mock";
import type {
  DownloadCategory,
  DownloadFile,
  FellowshipSlug,
} from "@/types/content";

import { mockResponse } from "./http";

const newestFirst = (a: DownloadFile, b: DownloadFile) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export function getDownloads(): Promise<DownloadFile[]> {
  return mockResponse([...DOWNLOADS].sort(newestFirst));
}

export function getDownloadsByCategory(
  category: DownloadCategory,
): Promise<DownloadFile[]> {
  return mockResponse(
    DOWNLOADS.filter((d) => d.category === category).sort(newestFirst),
  );
}

/** All categories at once, so the page makes a single call. */
export async function getDownloadsGrouped(): Promise<
  Record<DownloadCategory, DownloadFile[]>
> {
  const all = await getDownloads();

  return {
    bulletin: all.filter((d) => d.category === "bulletin"),
    form: all.filter((d) => d.category === "form"),
    document: all.filter((d) => d.category === "document"),
  };
}

export function getDownloadsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<DownloadFile[]> {
  return mockResponse(
    DOWNLOADS.filter((d) => d.fellowshipSlug === fellowshipSlug).sort(
      newestFirst,
    ),
  );
}
