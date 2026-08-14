import { networkInterfaces } from "node:os";
import { join } from "node:path";
import type { NextConfig } from "next";

/** Every non-internal IPv4 address this machine currently has. */
function localAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((address) => address?.family === "IPv4" && !address.internal)
    .map((address) => address!.address);
}

const nextConfig: NextConfig = {
  transpilePackages: ["@portal/shared"],

  /*
   * Emit a self-contained server at `.next/standalone/server.js`, with only the
   * dependencies actually reached traced in beside it.
   *
   * This is what makes a combined handover build practical: without it the CMS
   * needs the whole workspace `node_modules` at runtime — several hundred
   * megabytes, most of it build-time tooling — and the artifact is no longer
   * something you can hand someone.
   *
   * `outputFileTracingRoot` points at the monorepo root because `@portal/shared`
   * is a workspace package: traced from `frontend/` alone, Next would follow the
   * symlink out of the project and refuse to include it.
   */
  output: "standalone",
  outputFileTracingRoot: join(import.meta.dirname, ".."),

  /*
   * Let other devices on the network load dev-only assets (/_next/*, the HMR
   * socket). Next blocks cross-origin dev requests by default, which is what
   * stops the CMS working from a phone. These globs cover the private IPv4
   * ranges plus mDNS hostnames — a bare "*" is rejected by Next.
   */
  allowedDevOrigins: [
    "10.*.*.*",
    "172.*.*.*",
    "192.168.*.*",
    "169.254.*.*",
    "*.local",
  ],

  /*
   * Security headers for the CMS itself.
   *
   * Next sends none of these by default, and the API's `helmet` does not cover
   * this app — the two are separate servers, and behind the container's router
   * they answer on one origin, so a reader cannot tell which sent what.
   *
   * `frame-ancestors 'none'` is the one that matters: without it the whole
   * admin UI can be framed invisibly on another site and an administrator's
   * clicks aimed at something else — deleting a record, or publishing one. The
   * rest are inexpensive: stop the browser second-guessing declared types, and
   * stop full URLs (which carry record ids) leaking to third parties in the
   * referrer.
   *
   * No `script-src` policy here: Next inlines hydration scripts, and a CSP
   * strict enough to be worth having would need nonces threaded through the
   * whole app. Framing and sniffing are what this closes.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    /*
     * Uploaded media is served by the API, whose host varies: localhost while
     * developing, this machine's LAN address when the portal is opened from
     * another device. Listing the addresses we actually have keeps next/image
     * working in both cases. Port is left open so changing API_PORT does not
     * silently break image loading.
     */
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      ...localAddresses().map((hostname) => ({
        protocol: "http" as const,
        hostname,
      })),
    ],
  },
};

export default nextConfig;
