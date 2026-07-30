import { lanAddress } from "../common/utils/network";

export interface AppConfig {
  port: number;
  apiPrefix: string;
  publicUrl: string;
  corsOrigins: string[];
  corsAllowPrivateNetwork: boolean;
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
  mongodbUri:
    process.env.MONGODB_URI ?? "mongodb://localhost:27017/csistmc-portal",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  },
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? "15", 10),
  maxVideoUploadMb: parseInt(process.env.MAX_VIDEO_UPLOAD_MB ?? "200", 10),
  revalidate: {
    url: process.env.WEBSITE_REVALIDATE_URL ?? "",
    secret: process.env.WEBSITE_REVALIDATE_SECRET ?? "",
  },
});
