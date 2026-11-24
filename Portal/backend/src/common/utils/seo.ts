import { BadRequestException } from "@nestjs/common";

import type { SeoDto } from "../dto/seo.dto";
import { describeVideoProblem, inferVideoProvider } from "./video";

/**
 * Settles an SEO block before it is stored: the video's provider is inferred
 * from its URL, and a link the website could not play is refused now rather
 * than published as a dead player. `null` (clear it) passes through.
 */
export function cleanSeo<T extends SeoDto | null | undefined>(seo: T): T {
  if (!seo?.video) return seo;
  const url = seo.video.url.trim();
  const provider = seo.video.provider ?? inferVideoProvider(url);
  const problem = describeVideoProblem(url, provider);
  if (problem) throw new BadRequestException(`SEO video: ${problem}`);
  return { ...seo, video: { url, provider } } as T;
}
