import { FELLOWSHIPS } from "@/data/fellowships.mock";
import type { Fellowship, FellowshipSlug } from "@/types/content";

import { mockResponse } from "./http";

const byOrder = (a: Fellowship, b: Fellowship) => a.order - b.order;

export function getFellowships(): Promise<Fellowship[]> {
  return mockResponse([...FELLOWSHIPS].sort(byOrder));
}

export function getFellowshipBySlug(
  slug: string,
): Promise<Fellowship | null> {
  return mockResponse(FELLOWSHIPS.find((f) => f.slug === slug) ?? null);
}

/** Slugs for `generateStaticParams`. */
export function getFellowshipSlugs(): Promise<FellowshipSlug[]> {
  return mockResponse(FELLOWSHIPS.map((f) => f.slug));
}
