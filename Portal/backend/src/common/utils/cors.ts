/**
 * Origin matching for CORS.
 *
 * The portal is normally opened from other devices on the same network - a
 * phone or a laptop hitting the machine's LAN address - so a fixed list of
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
  /^10\./, // 10.0.0.0/8 - also where ZeroTier/Tailscale sit
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
 * same-origin, server-to-server) is always allowed - the header is only
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

/* -------------------------------------------------------------------------- */
/* F-068 - per-route policy                                                   */
/* -------------------------------------------------------------------------- */

export interface CorsPolicy extends CorsRules {
  /** Global route prefix, e.g. "v1". */
  apiPrefix: string;
  /**
   * Answer public reads with a literal `Access-Control-Allow-Origin: *` (no
   * credentials). On when `CORS_PUBLIC_READ_ANY_ORIGIN=true` or when
   * `CORS_ORIGINS` contains `*`.
   */
  publicReadAnyOrigin: boolean;
  /**
   * In production a `*` in `CORS_ORIGINS` never applies to writes, sign-in or
   * admin routes: those accept only the origins listed explicitly.
   */
  production: boolean;
}

const READ_METHODS = new Set(["GET", "HEAD"]);

interface CorsRequest {
  method?: string;
  url?: string;
  originalUrl?: string;
  headers: Record<string, string | string[] | undefined>;
}

/** The method the browser will actually send - for a preflight, the one it asks about. */
function effectiveMethod(req: CorsRequest): string {
  const method = (req.method ?? "GET").toUpperCase();
  if (method !== "OPTIONS") return method;
  const asked = req.headers["access-control-request-method"];
  return (Array.isArray(asked) ? asked[0] : asked ?? "").toUpperCase();
}

/** Sign-in/token routes and the whole admin API. */
export function isPrivilegedPath(url: string, apiPrefix: string): boolean {
  const path = url.split("?")[0];
  const prefix = apiPrefix ? `/${apiPrefix.replace(/^\/+|\/+$/g, "")}` : "";
  return new RegExp(`^${prefix}/(admin|auth)(/|$)`, "i").test(path);
}

/** A GET/HEAD (or its preflight) to anything but auth/admin. */
export function isPublicRead(req: CorsRequest, apiPrefix: string): boolean {
  return (
    READ_METHODS.has(effectiveMethod(req)) &&
    !isPrivilegedPath(req.originalUrl ?? req.url ?? "/", apiPrefix)
  );
}

type CorsOptionsLike = {
  origin: string | ReturnType<typeof corsOriginChecker>;
  credentials: boolean;
  methods?: string[];
  maxAge?: number;
};

/**
 * Builds the per-request options delegate for `app.enableCors`.
 *
 * - Public reads (website content, media) may be open to any origin, as a
 *   cacheable `*` without credentials.
 * - Everything else - POST/PATCH/PUT/DELETE, `/auth/*`, `/admin/*` - is
 *   credentialed and admits only `CORS_ORIGINS` (plus the LAN when
 *   `CORS_ALLOW_PRIVATE_NETWORK` is on). In production a `*` there is
 *   ignored for these routes, so a permissive setting cannot open the write
 *   API to every site on the internet.
 */
export function corsOptionsDelegate(policy: CorsPolicy) {
  const openReads = policy.publicReadAnyOrigin || policy.allowed.includes("*");
  const writeAllowed = policy.production
    ? policy.allowed.filter((origin) => origin !== "*")
    : policy.allowed;

  const publicOptions: CorsOptionsLike = {
    origin: "*",
    credentials: false,
    methods: ["GET", "HEAD", "OPTIONS"],
    maxAge: 86_400,
  };
  const restrictedOptions: CorsOptionsLike = {
    origin: corsOriginChecker({
      allowed: writeAllowed,
      allowPrivateNetwork: policy.allowPrivateNetwork,
    }),
    credentials: true,
  };

  return (
    req: CorsRequest,
    callback: (error: Error | null, options?: CorsOptionsLike) => void,
  ): void => {
    callback(
      null,
      openReads && isPublicRead(req, policy.apiPrefix) ? publicOptions : restrictedOptions,
    );
  };
}
