import { GALLERY_ALBUMS } from "@/data/gallery.mock";
import type { FellowshipSlug, GalleryAlbum } from "@/types/content";

import { mockResponse } from "./http";

const newestFirst = (a: GalleryAlbum, b: GalleryAlbum) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

export function getGallery(limit?: number): Promise<GalleryAlbum[]> {
  const albums = [...GALLERY_ALBUMS].sort(newestFirst);
  return mockResponse(limit ? albums.slice(0, limit) : albums);
}

export function getAlbumBySlug(slug: string): Promise<GalleryAlbum | null> {
  return mockResponse(GALLERY_ALBUMS.find((a) => a.slug === slug) ?? null);
}

export function getAlbumsByFellowship(
  fellowshipSlug: FellowshipSlug,
): Promise<GalleryAlbum[]> {
  // A fellowship's gallery holds its own event albums plus any shared,
  // churchwide albums (e.g. Christmas) the admin has marked as common.
  return mockResponse(
    GALLERY_ALBUMS.filter(
      (a) => a.fellowshipSlug === fellowshipSlug || a.shared,
    ).sort(newestFirst),
  );
}

/** Slugs for `generateStaticParams`. */
export function getAlbumSlugs(): Promise<string[]> {
  return mockResponse(GALLERY_ALBUMS.map((a) => a.slug));
}
