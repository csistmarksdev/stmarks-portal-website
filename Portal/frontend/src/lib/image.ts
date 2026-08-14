/**
 * Picking the right size of an uploaded image for the place it is shown.
 *
 * `ImageAsset` — what content records store — carries only the full-size `url`,
 * because that is what the public Website renders. A CMS list showing twenty of
 * those is twenty full-resolution photographs: a gallery card that needs a
 * 400px-wide picture pulls a 4 MB original to draw it, twenty times over, on
 * whatever connection the church office has.
 *
 * The media service already writes a 480px WebP thumbnail beside every image it
 * accepts, at a path derived from the original's. Deriving that path here is a
 * small piece of coupling to the media service's storage layout, and worth it:
 * the alternative is widening the stored contract shape (and every record in the
 * database) so a list page can load faster.
 *
 * The coupling is made safe rather than assumed correct — `<CardBanner>` falls
 * back to the original `url` if the derived thumbnail 404s, so an image uploaded
 * before thumbnails existed, or one whose processing failed, still appears.
 */

/** `…/uploads/images/<id>.jpg` → `…/uploads/thumbs/<id>.webp`. */
export function thumbnailUrl(url: string): string | undefined {
  const match = /^(.*\/uploads\/)images\/([^/]+)\.[^./]+$/.exec(url);
  return match ? `${match[1]}thumbs/${match[2]}.webp` : undefined;
}
