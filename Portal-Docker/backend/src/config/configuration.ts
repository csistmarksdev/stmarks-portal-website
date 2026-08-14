import { lanAddress } from "../common/utils/network";

export interface AppConfig {
  port: number;
  apiPrefix: string;
  publicUrl: string;
  corsOrigins: string[];
  corsAllowPrivateNetwork: boolean;
  /** Express `trust proxy` setting. `false` disables forwarded headers. */
  trustProxy: boolean | string | number;
  mongodbUri: string;
  jwt: {
    accessSecret: string;
    accessExpires: string;
    refreshSecret: string;
    refreshExpires: string;
  };
  uploadDir: string;
  maxUploadMb: number;
  maxVideoUploadMb: number;
  revalidate: {
    url: string;
    secret: string;
  };
}

/**
 * `TRUST_PROXY` as Express understands it: `false`/`true`, a hop count, or a
 * named range such as `loopback`.
 */
function parseTrustProxy(raw?: string): boolean | number | string | undefined {
  if (raw === undefined || raw === "") return undefined;
  if (raw === "false") return false;
  if (raw === "true") return true;
  const hops = Number(raw);
  return Number.isInteger(hops) && hops >= 0 ? hops : raw;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? "4000", 10),
  apiPrefix: process.env.API_PREFIX ?? "v1",
  /*
   * Origin used to build absolute media URLs. Those URLs are *stored* inside
   * content records, so defaulting to localhost would write addresses no other
   * device can load. Falls back to this machine's LAN address; set it
   * explicitly to the canonical origin in production.
   */
  publicUrl:
    process.env.PUBLIC_URL ??
    (lanAddress()
      ? `http://${lanAddress()}:${process.env.PORT ?? "4000"}`
      : `http://localhost:${process.env.PORT ?? "4000"}`),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  /*
   * Lets the CMS be opened from any device on the LAN without listing each
   * address — a real convenience while setting up in the church office.
   *
   * Off by default in production, on by default everywhere else. Combined with
   * `credentials: true`, blanket private-network trust means any page a staff
   * member opens on the same network can call the API as them; that is a fair
   * trade on a laptop and not one to make silently on a server. Set it
   * explicitly either way to override.
   */
  corsAllowPrivateNetwork:
    process.env.CORS_ALLOW_PRIVATE_NETWORK !== undefined
      ? process.env.CORS_ALLOW_PRIVATE_NETWORK !== "false"
      : process.env.NODE_ENV !== "production",
  /*
   * Whether to believe `X-Forwarded-For`.
   *
   * This decides what `req.ip` is, and `req.ip` is what the rate limiter buckets
   * by and what the audit log records. Left off behind a proxy, every request in
   * the world shares one bucket — one attacker can exhaust the sign-in limit for
   * the whole parish, and every audit entry names the proxy instead of a person.
   * Turned on when nothing is in front, a caller sets the header themselves and
   * the per-IP limit stops meaning anything.
   *
   * Off by default: in this layout the API is reached directly, so any
   * `X-Forwarded-For` on an inbound request was put there by the caller.
   */
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY) ?? false,
  mongodbUri:
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/csistmc-portal",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  },
  /*
   * Where uploaded media is written. Relative to the working directory, or
   * absolute.
   *
   * Absolute is what makes single-disk hosting work. Render, Fly and Railway
   * give a service exactly one persistent volume, and this deployment has two
   * things that must survive a redeploy — the database and the media. Pointing
   * `UPLOAD_DIR=/data/uploads` puts both under the one mount.
   *
   * Every consumer resolves this with `path.resolve` rather than `path.join`
   * for that reason: `join("/app/backend", "/data/uploads")` quietly produces
   * `/app/backend/data/uploads`, so an absolute setting would be accepted,
   * ignored, and the media written to the container's ephemeral layer instead.
   */
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? "15", 10),
  maxVideoUploadMb: parseInt(process.env.MAX_VIDEO_UPLOAD_MB ?? "200", 10),
  revalidate: {
    url: process.env.WEBSITE_REVALIDATE_URL ?? "",
    secret: process.env.WEBSITE_REVALIDATE_SECRET ?? "",
  },
});
