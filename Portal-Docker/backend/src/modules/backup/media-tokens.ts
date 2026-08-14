/**
 * Making a backup portable between installations.
 *
 * Media URLs are stored *absolute* inside content records — the public Website
 * reads this API cross-origin and cannot resolve a relative path against its
 * own domain. That is right at runtime and wrong in an archive: a backup taken
 * from `http://192.168.1.40:4000` and restored onto `https://csistmc.org`
 * would come back with every image pointing at a machine that is not there.
 *
 * So on the way out, any origin followed by `/uploads/` becomes the token
 * `{{MEDIA}}/`, and on the way in the token becomes whatever this installation
 * serves media from. A backup restored onto the same host is unchanged by the
 * round trip; one restored somewhere else quietly follows.
 *
 * This is the same convention `Portal-Docker`'s snapshot uses, deliberately —
 * a snapshot captured by the build scripts and a backup downloaded from the
 * CMS carry media the same way, so neither is a special case for the other.
 */

export const MEDIA_TOKEN = "{{MEDIA}}";

/**
 * Any `…/uploads/` origin -> `{{MEDIA}}/`.
 *
 * Deliberately not anchored to this installation's own `publicUrl`. Records
 * written before the origin last changed still hold the old one, and a backup
 * that tokenised only today's origin would preserve those stale absolute URLs
 * as-is — the one case where portability matters most.
 */
const ABSOLUTE_MEDIA_URL = /https?:\/\/[^/"\s]+\/uploads\//g;

/** True only for `{}`-shaped objects — not Dates, ObjectIds, Buffers, RegExps. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

/**
 * Walks a document, rewriting strings and leaving everything else alone.
 *
 * The `isPlainObject` guard is load-bearing rather than tidy. A `Date`, an
 * `ObjectId` and a `Binary` are all `typeof "object"`; recursing into one and
 * rebuilding it with `Object.fromEntries` replaces it with a meaningless plain
 * object, which would destroy every timestamp and every id in the archive.
 */
function walk(value: unknown, rewrite: (text: string) => string): unknown {
  if (typeof value === "string") return rewrite(value);
  if (Array.isArray(value)) return value.map((item) => walk(item, rewrite));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, walk(item, rewrite)]),
    );
  }
  return value;
}

/** Absolute media URLs -> the portable token, everywhere in a document. */
export function tokeniseMedia<T>(document: T): T {
  return walk(document, (text) =>
    text.includes("/uploads/") ? text.replace(ABSOLUTE_MEDIA_URL, `${MEDIA_TOKEN}/`) : text,
  ) as T;
}

/** The portable token -> this installation's media origin. */
export function resolveMedia<T>(document: T, mediaBase: string): T {
  return walk(document, (text) =>
    text.includes(MEDIA_TOKEN) ? text.split(MEDIA_TOKEN).join(mediaBase) : text,
  ) as T;
}
