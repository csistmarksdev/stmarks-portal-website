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

/**
 * Hosts `next/image` may optimise: the Portal API host, plus any media hosts
 * listed in `MEDIA_HOSTS` (comma-separated https origins - e.g. the object
 * storage bucket uploads move to, F-031). Extra media hosts are https-only.
 */
function portalMediaPatterns() {
  const api = portalApiUrl();
  const patterns: {
    protocol: "http" | "https";
    hostname: string;
    port: string;
    pathname: string;
  }[] = [];

  if (api) {
    patterns.push({
      protocol: api.protocol.replace(":", "") as "http" | "https",
      hostname: api.hostname,
      port: api.port,
      pathname: "/uploads/**",
    });
  }

  for (const origin of (process.env.MEDIA_HOSTS ?? "").split(",")) {
    const trimmed = origin.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:") continue;
      patterns.push({
        protocol: "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/**",
      });
    } catch {
      // A malformed entry should not take the build down.
    }
  }

  return patterns;
}

/**
 * F-008 / F-031: the Portal is still plain HTTP on a bare IP. Once ops have put
 * it behind HTTPS on a named host (team/build/ops-steps.md), set
 * `REQUIRE_HTTPS_API=1` and the build refuses an `http:` API base instead of
 * quietly shipping one. Until then it only warns, so the preview keeps working.
 */
function assertHttpsApi(): void {
  const api = portalApiUrl();
  if (!api || api.protocol === "https:" || apiIsOnPrivateNetwork()) return;
  const message = `NEXT_PUBLIC_API_URL is ${api.origin} (plain HTTP). Move the Portal behind HTTPS - see team/build/ops-steps.md.`;
  if (process.env.REQUIRE_HTTPS_API === "1") throw new Error(message);
  console.warn(`[security] ${message}`);
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

assertHttpsApi();

/**
 * The site's public origin, decided once per build.
 *
 * 1. `NEXT_PUBLIC_SITE_URL`, when set - the church's own domain once it is
 *    pointed at this site.
 * 2. Otherwise the domain Vercel serves production from
 *    (`VERCEL_PROJECT_PRODUCTION_URL`): the *.vercel.app address today, and
 *    the custom domain by itself the moment one is attached to the project.
 * 3. Otherwise (a local build) the church's intended domain.
 *
 * Link previews are why this matters: WhatsApp, Facebook and the rest fetch
 * `og:image` from the address written here, so it has to be one that answers.
 * The old fallback, csistmarksmadipakkam.org, does not resolve at all - every
 * shared link went out with an image no one could load.
 *
 * Inlined through `env` so server and browser read the identical value.
 */
function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "https://www.csistmarks.com";
}

const nextConfig: NextConfig = {
  // F-107: no `x-powered-by: Next.js` on every response.
  poweredByHeader: false,
  env: {
    SITE_ORIGIN: siteOrigin(),
  },
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
  /*
   * The Portal's uploads, on this site's own domain.
   *
   * `/uploads/images/prayer-meeting.jpg` here is fetched from the Portal and
   * served as if it were ours - so the sitemap, share images and structured
   * data can name every photograph at https://<this site>/uploads/… rather
   * than at the Portal's own address (a bare IP over plain HTTP today, a
   * subdomain later). Search engines and link previews then see the church's
   * domain, over HTTPS, with the readable file name intact, and none of those
   * addresses has to change when the Portal moves.
   *
   * A renamed file's old address answers 301 from the Portal with a relative
   * `/uploads/…` location, which resolves back through this same rewrite.
   */
  async rewrites() {
    const api = portalApiUrl();
    if (!api) return [];
    return [{ source: "/uploads/:path*", destination: `${api.origin}/uploads/:path*` }];
  },

  async headers() {
    const immutable = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];

    // Both frame sequences, in both their desktop and phone sizes, plus the
    // small header/footer marks and the share image (F-018).
    const cached = [
      "/frames/:path*",
      "/frames-m/:path*",
      "/welcome-frames/:path*",
      "/welcome-frames-m/:path*",
      "/hero/:path*",
      "/brand/:path*",
      "/og/:path*",
    ].map((source) => ({ source, headers: immutable }));

    /*
     * F-015: never index a *.vercel.app host - the preview link, deployment
     * URLs, branch previews. Matched on the host rather than on "not the
     * production domain", so the preview can set NEXT_PUBLIC_SITE_URL to itself
     * (working share previews, self-consistent canonicals) and still stay out
     * of search results. The church's own domain is never matched.
     */
    const noindexElsewhere = {
      source: "/:path*",
      has: [{ type: "host" as const, value: ".*\\.vercel\\.app" }],
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    };

    /*
     * The proxied uploads: a file's name is never handed out twice, so a copy
     * stays good - a day in the browser, a week at the edge - while a deleted
     * photograph still drops out within the week.
     *
     * Where the host lets an external rewrite's own response headers win, the
     * Portal's `Cache-Control` decides instead (it sends `max-age=0` today, so
     * every view is fetched from it). The lasting fix is for the Portal's
     * /uploads to send caching headers of its own.
     */
    const uploads = {
      source: "/uploads/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      ],
    };

    /*
     * F-067: baseline security headers on every response. Nothing frames this
     * site (the Portal only embeds video players), so framing is refused
     * outright; camera, microphone and location are never used. A full
     * script/style Content-Security-Policy is not set here: the inline
     * bootstraps in `[locale]/layout.tsx` would need nonces first.
     */
    const security = {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
        },
      ],
    };

    return [security, ...cached, uploads, noindexElsewhere];
  },
};

export default withNextIntl(nextConfig);
