/**
 * Mirrors the API's `slugify` (backend/src/common/utils/slugify.ts) so the
 * form can preview the URL a record will get. The API stays the authority: it
 * cleans the slug again and appends -2, -3… when the address is taken.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** A slug may still change while nothing public points at it. */
export function slugEditable(savedStatus: string | undefined): boolean {
  return !savedStatus || savedStatus === "draft" || savedStatus === "pending";
}
