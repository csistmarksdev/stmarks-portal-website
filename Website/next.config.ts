import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
    // Remote patterns get declared here once the NestJS media API exists.
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  /**
   * Long-cache the build-static media that never changes between deploys — the
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
