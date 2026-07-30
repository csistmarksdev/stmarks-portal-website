import type { GalleryVideo } from "@portal/shared";

type Provider = NonNullable<GalleryVideo["provider"]>;

/*
 * These patterns mirror `Website/src/features/gallery/photo-grid.tsx`
 * exactly. The Website builds its embed URL from the id it extracts here, so
 * a link this file accepts but that file cannot parse would render a dead
 * player on the live site — which is why the Portal validates on write rather
 * than storing whatever was pasted.
 */
const YOUTUBE_HOST = /(?:youtube\.com|youtu\.be)/i;
const VIMEO_HOST = /vimeo\.com/i;
const YOUTUBE_ID = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;

/** How the Website will play this URL. */
export function inferVideoProvider(url: string): Provider {
  if (YOUTUBE_HOST.test(url)) return "youtube";
  if (VIMEO_HOST.test(url)) return "vimeo";
  return "file";
}

export function youTubeId(url: string): string | null {
  return url.match(YOUTUBE_ID)?.[1] ?? null;
}

export function vimeoId(url: string): string | null {
  return url.match(VIMEO_ID)?.[1] ?? null;
}

/**
 * Explains why a URL would not play, or returns null when it is fine.
 * Hosted links must yield an id the embed URL can be built from; anything else
 * is treated as a direct file and only needs to be a URL.
 */
export function describeVideoProblem(
  url: string,
  provider: Provider = inferVideoProvider(url),
): string | null {
  if (provider === "youtube" && !YOUTUBE_ID.test(url)) {
    return "That YouTube link has no video id in it. Use the address from the browser bar (youtube.com/watch?v=…) or the Share button (youtu.be/…).";
  }
  if (provider === "vimeo" && !VIMEO_ID.test(url)) {
    return "That Vimeo link has no video id in it — it should look like vimeo.com/123456789.";
  }
  if (provider === "file") {
    try {
      new URL(url);
    } catch {
      return "That is not a valid video address. Paste a full link starting with https://";
    }
  }
  return null;
}
