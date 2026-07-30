import { join } from "node:path";
import type { NextConfig } from "next";

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

  images: {
    formats: ["image/avif", "image/webp"],
    /*
     * Uploaded media is served by the API, whose host is not knowable at build
     * time. Listing the build machine's own addresses — which is what this did
     * — bakes them into the image, so a container built on a laptop and run on
     * Render refuses every image it is asked to optimise and the CMS comes up
     * blank.
     *
     * The path is what is constrained instead: only `/uploads/**` is allowed,
     * so this is an image proxy for our own media and nothing else. Host is
     * open because in this deployment the host *is* the deployment.
     */
    remotePatterns: [
      { protocol: "http", hostname: "**", pathname: "/uploads/**" },
      { protocol: "https", hostname: "**", pathname: "/uploads/**" },
    ],
    /*
     * Optimisation needs a writable cache and CPU on every cold image. That is
     * a poor trade in a container that already stores a WebP thumbnail beside
     * each upload, and on a small host it is the difference between the CMS
     * feeling instant and feeling broken. Serve the bytes we already have.
     */
    unoptimized: process.env.NEXT_PUBLIC_UNOPTIMIZED_IMAGES === "true",
  },
};

export default nextConfig;
