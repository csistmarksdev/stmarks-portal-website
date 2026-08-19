import { FELLOWSHIPS } from "@/data/fellowships.mock";
import type { Fellowship, FellowshipSlug } from "@/types/content";

import { apiGet, apiGetOrNull } from "./http";

const byOrder = (a: Fellowship, b: Fellowship) => a.order - b.order;

const TAGS = ["fellowships"];

export function getFellowships(): Promise<Fellowship[]> {
  return apiGet<Fellowship[]>("/fellowships", {
    tags: TAGS,
    fallback: () => [...FELLOWSHIPS].sort(byOrder),
  });
}

export function getFellowshipBySlug(
  slug: string,
): Promise<Fellowship | null> {
  return apiGetOrNull<Fellowship>(`/fellowships/${slug}`, {
    tags: TAGS,
    fallback: () => FELLOWSHIPS.find((f) => f.slug === slug) ?? null,
  });
}

/** Slugs for `generateStaticParams`. */
export function getFellowshipSlugs(): Promise<FellowshipSlug[]> {
  return apiGet<FellowshipSlug[]>("/fellowships/slugs", {
    tags: TAGS,
    fallback: () => FELLOWSHIPS.map((f) => f.slug),
  });
}

/**
 * The same slugs, for the navigation menu - which must never fail the page it
 * sits on.
 *
 * `apiGet`'s `fallback` covers an *unconfigured* API only: once
 * `NEXT_PUBLIC_API_URL` is set, a failed request throws on purpose, so a
 * content page errors rather than quietly serving stale fiction. That is the
 * right trade for content and the wrong one for chrome. The menu renders in the
 * root layout, so an outage on this one endpoint would otherwise take down
 * every page on the site over a submenu.
 *
 * Degrading to the full local list is the behaviour the menu had before it was
 * narrowed at all - at worst a link to a fellowship that is temporarily
 * unreachable, which is what the reader would hit anyway.
 */
export async function getFellowshipSlugsForNav(): Promise<FellowshipSlug[]> {
  try {
    return await getFellowshipSlugs();
  } catch {
    return FELLOWSHIPS.map((f) => f.slug);
  }
}

/**
 * The menu's fellowships - which pages exist, *and* what the church calls them.
 *
 * The slug-only version above was not enough. The submenu was labelling itself
 * from `src/messages/*.json`, so renaming a fellowship in the Portal changed
 * the cards and the fellowship's own page while the menu kept the old name
 * indefinitely. Names are content and have to come from the record.
 *
 * `/fellowships` rather than `/fellowships/slugs`: it is one request either
 * way, it carries the same `fellowships` tag so a publish invalidates both
 * together, and the menu needs a field the slugs endpoint does not return.
 *
 * Degrades the same way and for the same reason - this renders in the root
 * layout, where a throw would take down every page on the site over a submenu.
 */
export async function getFellowshipsForNav(): Promise<
  { slug: FellowshipSlug; name: Fellowship["name"] }[]
> {
  try {
    const fellowships = await getFellowships();
    return fellowships.map(({ slug, name }) => ({ slug, name }));
  } catch {
    return [...FELLOWSHIPS]
      .sort(byOrder)
      .map(({ slug, name }) => ({ slug, name }));
  }
}
