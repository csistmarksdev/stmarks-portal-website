import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { LEGACY_SECTION_PATHS } from "./src/constants/site";
import { defaultLocale, locales } from "./src/i18n/locales";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Allow `next/image` to optimise media served by the Portal.
 *
 * Derived from `NEXT_PUBLIC_API_URL` rather than hardcoded, so the same config
 * works in dev (`http://localhost:4000/v1`) and in production without an edit -
 * and so a deployment that has not configured the API simply allows nothing,
 * which is the safe default. Scoped to `/uploads/**`: the API's JSON routes are
 * not images and have no business being proxied through the optimiser.
 */
function portalApiUrl(): URL | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    return new URL(apiUrl);
  } catch {
    // A malformed URL should not take the whole build down.
    return null;
  }
}

function portalMediaPatterns() {
  const api = portalApiUrl();
  if (!api) return [];

  return [
    {
      protocol: api.protocol.replace(":", "") as "http" | "https",
      hostname: api.hostname,
      port: api.port,
      pathname: "/uploads/**",
    },
  ];
}

/**
 * Next 16 refuses to optimise images whose host resolves to a private or
 * loopback address - an SSRF guard, so a crafted `/_next/image?url=…` cannot be
 * used to probe the network the server sits on. `dangerouslyAllowLocalIP` opts
 * out of it.
 *
 * It is enabled only when the *configured Portal API* is itself on a private
 * address, which is the situation the guard is not meant to catch: in
 * development the API is `localhost:4000`, and in this deployment it is the
 * ZimaOS box on a LAN. Point `NEXT_PUBLIC_API_URL` at a public hostname and the
 * protection switches itself back on, rather than being silently disabled
 * forever by a flag someone set once during development.
 */
function apiIsOnPrivateNetwork(): boolean {
  const hostname = portalApiUrl()?.hostname;
  if (!hostname) return false;

  const host = hostname.replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

const nextConfig: NextConfig = {
  // Let other devices on the LAN load dev-only assets (/_next/*, HMR socket).
  // Next blocks cross-origin dev requests by default; these cover the private
  // IPv4 ranges plus mDNS hostnames. A bare "*" is rejected by Next.
  allowedDevOrigins: [
    "10.*.*.*",
    "172.*.*.*",
    "192.168.*.*",
    "*.local",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: portalMediaPatterns(),
    dangerouslyAllowLocalIP: apiIsOnPrivateNetwork(),
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  /**
   * The pages that became chapters.
   *
   * About, leadership, fellowships, events, the blog index, the gallery,
   * announcements and downloads are sections of `/` now. Their old paths are
   * in the church's printed material, in search results and in people's
   * bookmarks, so each one still answers - with a 308 to the fragment its
   * content moved to.
   *
   * Done here rather than with a `redirect()` in a stub page, and the reason is
   * measurable rather than stylistic: a `redirect()` inside a statically
   * prerendered route cannot set a Location header, so Next emits the page as
   * 200 HTML carrying `<meta http-equiv="refresh" content="1;url=…">`. That is
   * a blank second for every reader following an old link, and a 200 for every
   * crawler deciding whether the old URL still exists. A config redirect is
   * checked before the filesystem, so it costs no page at all and answers with
   * the status code that actually means "this moved".
   *
   * Two rules per path, because the locale prefix is not part of the pattern:
   * Tamil is served from `/` and so has no prefix to match, every other locale
   * has one and must keep it across the redirect.
   */
  async redirects() {
    const prefixed = locales.filter((locale) => locale !== defaultLocale);

    return Object.entries(LEGACY_SECTION_PATHS).flatMap(([path, id]) => [
      {
        source: path,
        destination: `/#${id}`,
        permanent: true,
      },
      ...prefixed.map((locale) => ({
        source: `/${locale}${path}`,
        destination: `/${locale}/#${id}`,
        permanent: true,
      })),
    ]);
  },

  /**
   * Long-cache the build-static media that never changes between deploys - the
   * home hero's 300-frame sequence and the inner-page hero backdrops. Without
   * this, unfingerprinted `public/` assets revalidate on every visit; with it
   * the ~16 MB frame set is fetched once and served from cache thereafter,
   * which is the single biggest repeat-visit win on the home page.
   */
  async headers() {
    return [
      {
        source: "/frames/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/hero/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
