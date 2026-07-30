import { GALLERY_ALBUMS } from "@/data/gallery.mock";
import type { FellowshipSlug, GalleryAlbum } from "@/types/content";

import { apiGet, apiGetOrNull } from "./http";

const newestFirst = (a: GalleryAlbum, b: GalleryAlbum) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

const TAGS = ["gallery"];

export function getGallery(limit?: number): Promise<GalleryAlbum[]> {
  return apiGet<GalleryAlbum[]>("/gallery", {
    params: { limit },
    tags: TAGS,
    fallback: () => {
      const albums = [...GALLERY_ALBUMS].sort(newestFirst);
      return limit ? albums.slice(0, limit) : albums;
    },
  });
}

export function getAlbumBySlug(slug: string): Promise<GalleryAlbum | null> {
  return apiGetOrNull<GalleryAlbum>(`/gallery/${slug}`, {
    tags: TAGS,
    fallback: () => GALLERY_ALBUMS.find((a) => a.slug === slug) ?? null,
  });
}

export function getAlbumsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<GalleryAlbum[]> {
  // A fellowship's gallery holds its own event albums plus any shared,
  // churchwide albums (e.g. Christmas) the admin has marked as common.
  // The API applies the same rule server-side (contract §5.3).
  return apiGet<GalleryAlbum[]>("/gallery", {
    params: { fellowship: fellowshipSlug },
    tags: TAGS,
    fallback: () =>
      GALLERY_ALBUMS.filter(
        (a) => a.fellowshipSlug === fellowshipSlug || a.shared,
      ).sort(newestFirst),
  });
}

/** Slugs for `generateStaticParams`. */
export function getAlbumSlugs(): Promise<string[]> {
  return apiGet<string[]>("/gallery/slugs", {
    tags: TAGS,
    fallback: () => GALLERY_ALBUMS.map((a) => a.slug),
  });
}
