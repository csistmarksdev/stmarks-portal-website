import { SITE_CONFIG } from "@/constants/site";

/**
 * A Portal upload, wherever the Portal happens to be: `http://host/uploads/…`
 * (the Portal stamps its own origin on every media URL).
 */
const PORTAL_UPLOAD = /^https?:\/\/[^/]+(\/uploads\/[^?#]+)/;

/**
 * The site-relative path of a Portal upload - `/uploads/images/x.jpg` - which
 * this site serves through the `/uploads` rewrite in `next.config.ts`; null
 * for anything that is not one.
 */
export function uploadPath(url: string | undefined): string | null {
  return url?.match(PORTAL_UPLOAD)?.[1] ?? null;
}

/**
 * Any media address as it should appear in what search engines and link
 * previews read (sitemap, Open Graph, structured data): a Portal upload on
 * this site's own domain, a site-relative path made absolute, anything else
 * (YouTube, Vimeo) as it is.
 */
export function siteMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const path = uploadPath(url);
  if (path) return `${SITE_CONFIG.url}${path}`;
  if (url.startsWith("/")) return `${SITE_CONFIG.url}${url}`;
  return url;
}
