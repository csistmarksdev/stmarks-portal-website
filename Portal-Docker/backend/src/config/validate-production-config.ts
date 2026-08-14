import type { AppConfig } from "./configuration";

/**
 * Refuses to start a production process on unsafe configuration, and warns
 * about configuration that is merely incomplete.
 *
 * Every value in `configuration.ts` has a fallback so `npm run dev` works with
 * no setup. That is right for a laptop and dangerous on a server: a deploy that
 * forgets `JWT_ACCESS_SECRET` does not crash, it starts happily and signs admin
 * tokens with the string `dev-access-secret` — which is in this repository, so
 * anyone who can read it can mint themselves an administrator.
 *
 * Fatal versus warning
 * --------------------
 * The split is deliberate, and was originally wrong. Everything imperfect was
 * fatal, which blocked the documented deployment order: the Portal is deployed
 * *before* the website, so at that moment nobody can know the website's
 * revalidation URL — and refusing to boot over it left an otherwise healthy
 * installation dead for a setting that only affects how quickly published
 * changes appear.
 *
 * So: anything that lets a stranger in, or that cannot be corrected later, is
 * fatal. Anything that can be filled in once the other half of the system
 * exists is a warning, printed loudly at every boot until it is resolved.
 */

/** Values shipped as fallbacks or placeholders — never acceptable on a server. */
const KNOWN_PLACEHOLDERS = new Set([
  "dev-access-secret",
  "dev-refresh-secret",
  "change-me-access",
  "change-me-refresh",
  "change-me-access-secret",
  "change-me-refresh-secret",
  "local-dev-revalidate-secret",
  "ChangeMe@123",
  "changeme",
  "secret",
  "password",
]);

/** Long enough that guessing is not a strategy; below this, HMAC keys are weak. */
const MIN_SECRET_LENGTH = 32;

const LOCAL_ADDRESS = /localhost|127\.0\.0\.1|(^|\/\/)(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./;

export interface ProductionConfigReport {
  /** Unsafe. The process must not start. */
  problems: string[];
  /** Incomplete but serviceable. Worth saying at every boot. */
  warnings: string[];
}

export function collectProductionConfigReport(
  config: AppConfig,
  env: NodeJS.ProcessEnv = process.env,
): ProductionConfigReport {
  const problems: string[] = [];
  const warnings: string[] = [];

  /* ------------------------------ fatal ---------------------------------- */

  const secret = (name: string, value: string) => {
    if (!value) {
      problems.push(`${name} is not set.`);
      return;
    }
    if (KNOWN_PLACEHOLDERS.has(value)) {
      problems.push(
        `${name} is still the built-in placeholder. Anyone with the source can forge tokens with it.`,
      );
      return;
    }
    if (value.length < MIN_SECRET_LENGTH) {
      problems.push(
        `${name} is ${value.length} characters; use at least ${MIN_SECRET_LENGTH} (\`openssl rand -base64 48\`).`,
      );
    }
  };

  secret("JWT_ACCESS_SECRET", config.jwt.accessSecret);
  secret("JWT_REFRESH_SECRET", config.jwt.refreshSecret);

  if (config.jwt.accessSecret === config.jwt.refreshSecret) {
    problems.push(
      "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical; a leaked access token then forges refresh tokens too.",
    );
  }

  /*
   * The administrator password. Not part of `AppConfig` because the API never
   * reads it — it is used once, by the initializer, to create the first
   * account. That is exactly why it needed checking here: nothing else looks at
   * it, so a deployment left on the example value ships a CMS whose login is
   * published in this repository.
   */
  const adminPassword = env.SEED_ADMIN_PASSWORD ?? "";
  if (!adminPassword) {
    problems.push(
      "SEED_ADMIN_PASSWORD is not set; the first boot would have no way to create an administrator.",
    );
  } else if (KNOWN_PLACEHOLDERS.has(adminPassword)) {
    problems.push(
      "SEED_ADMIN_PASSWORD is still the example value, which is published in the source.",
    );
  } else if (adminPassword.length < 12) {
    problems.push(
      `SEED_ADMIN_PASSWORD is ${adminPassword.length} characters; use at least 12.`,
    );
  }

  // Blanket private-network trust plus credentials means any page on the same
  // network can act as a signed-in administrator.
  if (config.corsAllowPrivateNetwork) {
    problems.push(
      "CORS_ALLOW_PRIVATE_NETWORK is on, which admits any private-network origin with credentials. Set it to false and list real origins in CORS_ORIGINS.",
    );
  }

  /* ----------------------------- warnings -------------------------------- */

  /*
   * A local `PUBLIC_URL` is wrong for anyone but the server itself, but it is
   * recoverable: the initializer repoints stored media URLs on the next boot.
   * Warn rather than refuse, so a first deploy can come up and *tell* you the
   * address it is reachable at.
   */
  /*
   * Only a problem when nothing is correcting media origins per request. With
   * `MediaOriginInterceptor` active — the default, and how the container ships —
   * a stored `localhost` URL is rewritten to the caller's own origin on the way
   * out, so a local `PUBLIC_URL` costs nothing and the warning would be noise
   * at every boot of a perfectly working deployment.
   */
  const rewritesMediaPerRequest = env.MEDIA_ORIGIN_FROM_REQUEST !== "false";

  if (LOCAL_ADDRESS.test(config.publicUrl) && !rewritesMediaPerRequest) {
    warnings.push(
      `PUBLIC_URL is "${config.publicUrl}", a local address — images will not load for anyone else. Set it to the public origin and restart; stored URLs are repaired automatically.`,
    );
  }

  const localOrigins = config.corsOrigins.filter((origin) =>
    LOCAL_ADDRESS.test(origin),
  );
  if (localOrigins.length > 0) {
    warnings.push(
      `CORS_ORIGINS contains local origins (${localOrigins.join(", ")}); the public website will be refused by the browser until its real domain is listed.`,
    );
  }

  // Expected while the website has not been deployed yet.
  if (!config.revalidate.url || !config.revalidate.secret) {
    warnings.push(
      "WEBSITE_REVALIDATE_URL / WEBSITE_REVALIDATE_SECRET are unset, so publishing will not refresh the website immediately; it will pick changes up within about five minutes.",
    );
  }

  return { problems, warnings };
}

/** Kept for callers that only care whether the configuration is unsafe. */
export function collectProductionConfigProblems(
  config: AppConfig,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return collectProductionConfigReport(config, env).problems;
}

/**
 * Throws unless the configuration is safe to serve the public internet, and
 * prints anything merely incomplete. Only enforced when `NODE_ENV=production`,
 * so development keeps its zero-setup defaults; call it before the app starts
 * listening.
 */
export function assertProductionConfig(
  config: AppConfig,
  nodeEnv = process.env.NODE_ENV,
): void {
  if (nodeEnv !== "production") return;

  const { problems, warnings } = collectProductionConfigReport(config);

  if (warnings.length > 0) {
    /* eslint-disable no-console */
    console.warn(
      `\n⚠  ${warnings.length} setting(s) still to complete:\n` +
        warnings.map((w) => `   • ${w}`).join("\n") +
        "\n   The Portal will run, but finish these before handing it over.\n",
    );
    /* eslint-enable no-console */
  }

  if (problems.length === 0) return;

  throw new Error(
    `Refusing to start: ${problems.length} unsafe production setting(s).\n` +
      problems.map((p) => `  • ${p}`).join("\n") +
      "\n\nThese are security settings — fix them in the environment. " +
      "Run with NODE_ENV unset for local development.",
  );
}
