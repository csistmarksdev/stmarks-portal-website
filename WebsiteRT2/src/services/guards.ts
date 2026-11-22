import type { LocalizedText, LocalizedTextOptional } from "@/types/common";
import type {
  ChurchEvent,
  GalleryAlbum,
  GalleryPhoto,
} from "@/types/content";

/**
 * Publication guards - the site's last line of defence against seed data.
 *
 * The audit (F-003, F-004, F-005) found test records live in the Portal: an
 * announcement titled "Sample"/"மாதிரி", a `sample-harvest-festival` event, a
 * "DEMO - replace with the Easter service recording" video (Big Buck Bunny), and
 * an event dated 2027 under a 2026 slug. The fix belongs in the CMS (delete the
 * records; block such titles on publish), but until that happens - and in case
 * it happens again - the public site refuses to render them.
 *
 * Hidden is not deleted: the records remain in the Portal for the office to
 * correct or remove.
 */

const PLACEHOLDER =
  /\b(sample|demo|test|lorem|ipsum|placeholder|dummy)\b|மாதிரி|big buck bunny/i;

/** The Blender open-movie used as the demo clip (youtube id aqz-KE-bpKQ). */
const DEMO_VIDEO = /aqz-KE-bpKQ|bigbuckbunny|big_buck_bunny/i;

type Text = LocalizedText | LocalizedTextOptional | undefined;

function textOf(value: Text): string {
  if (!value) return "";
  return Object.values(value).filter(Boolean).join(" ");
}

export function looksLikePlaceholder(...values: (Text | string)[]): boolean {
  return values.some((value) =>
    PLACEHOLDER.test(typeof value === "string" ? value : textOf(value)),
  );
}

export function isPlaceholderSlug(slug: string): boolean {
  return PLACEHOLDER.test(slug.replace(/-/g, " "));
}

/** Any record with a slug and a title: hide seed data. */
export function isPublishable(record: { slug?: string; title: Text }): boolean {
  if (record.slug && isPlaceholderSlug(record.slug)) return false;
  return !looksLikePlaceholder(record.title);
}

/**
 * An event whose slug names one year and whose date is in another is a data
 * entry error (F-005: `womens-fellowship-day-2026` stored as 11 Oct 2027,
 * promoted as "upcoming"). The right date is for the church office to confirm,
 * so the record is hidden rather than guessed at.
 */
export function eventDateMatchesSlug(event: ChurchEvent): boolean {
  const slugYear = event.slug.match(/(?:^|-)((?:19|20)\d{2})(?:-|$)/)?.[1];
  if (!slugYear) return true;
  const start = new Date(event.startDate);
  if (Number.isNaN(start.getTime())) return true;
  const year = Number(
    new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(start),
  );
  return year === Number(slugYear);
}

export function isPublishableEvent(event: ChurchEvent): boolean {
  return isPublishable(event) && eventDateMatchesSlug(event);
}

/** Drop demo clips and items captioned as placeholders from an album. */
export function isPublishablePhoto(photo: GalleryPhoto): boolean {
  if (photo.video && DEMO_VIDEO.test(photo.video.url)) return false;
  return !looksLikePlaceholder(photo.image.alt, photo.caption);
}

export function cleanAlbum(album: GalleryAlbum): GalleryAlbum | null {
  if (!isPublishable(album)) return null;
  return { ...album, photos: album.photos.filter(isPublishablePhoto) };
}
