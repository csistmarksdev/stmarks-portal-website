/**
 * Origin matching for CORS.
 *
 * The portal is normally opened from other devices on the same network — a
 * phone or a laptop hitting the machine's LAN address — so a fixed list of
 * `localhost` origins locks everyone else out. Private-network origins are
 * therefore allowed by default on any port, while the public internet still
 * needs an explicit entry in `CORS_ORIGINS`.
 */

/** Hostnames that are unambiguously this machine or a private LAN. */
const PRIVATE_HOST = [
  /^localhost$/i,
  /^127\./,
  /^\[?::1\]?$/,
  /^0\.0\.0\.0$/,
  /^10\./, // 10.0.0.0/8 — also where ZeroTier/Tailscale sit
  /^192\.168\./, // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^169\.254\./, // link-local
  /\.local$/i, // mDNS / Bonjour
];

export function isPrivateOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return PRIVATE_HOST.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

export interface CorsRules {
  /** Exact origins from `CORS_ORIGINS`; `*` means allow anything. */
  allowed: string[];
  /** Whether LAN/loopback origins are permitted regardless of the list. */
  allowPrivateNetwork: boolean;
}

/**
 * Builds the callback Nest's `enableCors` expects. A missing origin (curl,
 * same-origin, server-to-server) is always allowed — the header is only
 * meaningful for browsers.
 */
export function corsOriginChecker({ allowed, allowPrivateNetwork }: CorsRules) {
  const anyOrigin = allowed.includes("*");

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ): void => {
    if (!origin || anyOrigin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    if (allowPrivateNetwork && isPrivateOrigin(origin)) {
      return callback(null, true);
    }
    // Deny by omitting the header rather than throwing: the browser blocks the
    // response, which is how CORS is meant to work. Throwing would turn every
    // stray cross-origin probe into a logged 500.
    callback(null, false);
  };
}
