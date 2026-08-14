/* eslint-disable no-console */
/**
 * Single entrypoint for the self-contained Portal container.
 *
 * On boot it:
 *   1. works out the public origin, asking the hosting platform if it can
 *   2. fills in any missing secrets, durably
 *   3. starts the bundled MongoDB — unless pointed at an external one
 *   4. restores the baked-in snapshot, if the database is empty
 *   5. runs the first-run initializer (idempotent)
 *   6. starts the API and the CMS on internal ports
 *   7. serves both from ONE public port
 *
 * Nothing is compiled here. The API is already `dist/`, the CMS is already a
 * Next standalone server with its `.next` output beside it; both are built once
 * when the image is built. A container that runs `next build` on boot needs a
 * gigabyte of RAM and a minute of CPU *every time it starts* — on a small host
 * that is the difference between a restart and an outage, and it is pure waste
 * because the result is byte-for-byte what the image already contains.
 *
 * Why one port
 * ------------
 * Hosting platforms give an application a single `$PORT` and route one hostname
 * to it. Two exposed ports means two apps, two URLs and CORS between them; one
 * port means the CMS and the API share an origin, so the API base is simply
 * `https://your-host/v1` and uploaded media is `https://your-host/uploads/...`.
 *
 *   /v1/*       -> API
 *   /uploads/*  -> API   (uploaded media)
 *   /docs*      -> API   (Swagger, off in production unless enabled)
 *   everything else -> CMS
 *
 * Set `SPLIT_PORTS=true` to skip the router and expose the two servers
 * directly, for a host that can route to both. Note that the CMS is built
 * expecting a shared origin, so `SPLIT_PORTS` also needs `NEXT_PUBLIC_API_URL`
 * set at build time to be useful from a browser.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { createConnection } from "node:net";
import { join } from "node:path";
import { URL } from "node:url";

/*
 * Everything resolves against this file's own directory rather than a fixed
 * path, so the same entrypoint drives an uploaded folder, a container, or a
 * checkout — and can be tested outside all three.
 */
const ROOT = import.meta.dirname;

const log = (msg) => console.log(`[portal] ${msg}`);

/* ------------------------------------------------------------------ config */

/**
 * Load `.env` from beside this file, if there is one.
 *
 * Hosting platforms inject configuration as real environment variables, but
 * anyone deploying to a plain VM reaches for a `.env` file. Real environment
 * variables always win, so a platform's dashboard is never overridden by a
 * stale file left in the image.
 */
function loadEnvFile() {
  const file = join(ROOT, ".env");
  if (!existsSync(file)) return false;

  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (key in process.env) continue;

    let value = line.slice(eq + 1).trim();
    // Strip one matching pair of surrounding quotes, so values containing `#`
    // or spaces can be quoted the way every other tool expects.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

const loadedEnvFile = loadEnvFile();

/** The one port the outside world reaches. Hosting platforms set this. */
const PUBLIC_PORT = Number(process.env.PORT ?? 8080);
/** Internal, loopback-only unless SPLIT_PORTS is set. */
const API_PORT = Number(process.env.API_PORT ?? 4000);
const CMS_PORT = Number(process.env.CMS_PORT ?? 3001);

const SPLIT_PORTS = process.env.SPLIT_PORTS === "true";
const BIND = SPLIT_PORTS ? "0.0.0.0" : "127.0.0.1";

/** Path prefixes the API owns. Everything else belongs to the CMS. */
const API_PREFIXES = [`/${process.env.API_PREFIX ?? "v1"}`, "/uploads", "/docs"];

/**
 * Writable state that must outlive the container: the database, and any
 * secrets generated on first boot. A volume mounted here makes the deployment
 * durable; without one it still runs, and resets to the snapshot on restart.
 */
const STATE_DIR = process.env.STATE_DIR ?? "/data";
const MONGO_DATA_DIR = process.env.MONGO_DATA_DIR ?? join(STATE_DIR, "db");

/* ------------------------------------------------------------ public origin */

/**
 * The origin browsers will use, discovered from the platform where possible.
 *
 * On most platforms you cannot know your own URL until after the first deploy,
 * which is exactly when you need it: it is what stored media URLs are built
 * from. Each of these variables is set by its platform before the process
 * starts, so a deploy with no configuration at all still comes up with the
 * right origin.
 *
 * Failing to find one is not fatal — `MediaOriginInterceptor` rewrites media
 * origins per request anyway, so this is a better starting value rather than a
 * requirement.
 */
function detectPublicUrl() {
  const env = process.env;

  if (env.PUBLIC_URL) return { url: env.PUBLIC_URL.replace(/\/$/, ""), from: "PUBLIC_URL" };

  // Render sets the full URL; everyone else sets a hostname to build one from.
  if (env.RENDER_EXTERNAL_URL) {
    return { url: env.RENDER_EXTERNAL_URL.replace(/\/$/, ""), from: "Render" };
  }
  if (env.RAILWAY_PUBLIC_DOMAIN) {
    return { url: `https://${env.RAILWAY_PUBLIC_DOMAIN}`, from: "Railway" };
  }
  if (env.CONTAINER_APP_NAME && env.CONTAINER_APP_ENV_DNS_SUFFIX) {
    return {
      url: `https://${env.CONTAINER_APP_NAME}.${env.CONTAINER_APP_ENV_DNS_SUFFIX}`,
      from: "Azure Container Apps",
    };
  }
  if (env.WEBSITE_HOSTNAME) {
    return { url: `https://${env.WEBSITE_HOSTNAME}`, from: "Azure App Service" };
  }
  if (env.FLY_APP_NAME) {
    return { url: `https://${env.FLY_APP_NAME}.fly.dev`, from: "Fly.io" };
  }
  if (env.KOYEB_PUBLIC_DOMAIN) {
    return { url: `https://${env.KOYEB_PUBLIC_DOMAIN}`, from: "Koyeb" };
  }
  // AWS App Runner publishes the service's hostname to the container.
  if (env.AWS_APPRUNNER_SERVICE_URL) {
    return { url: `https://${env.AWS_APPRUNNER_SERVICE_URL}`, from: "AWS App Runner" };
  }

  return { url: `http://localhost:${PUBLIC_PORT}`, from: "fallback" };
}

/* ----------------------------------------------------------------- secrets */

/**
 * Generate any missing secret once, and keep it.
 *
 * The API refuses to start in production without real JWT secrets, and rightly
 * so. But requiring them by hand contradicts what this image is for — dropping
 * it on a host and having it work — and the obvious shortcut, baking secrets
 * into the image, would ship the same signing key to every deployment and put
 * it in any registry the image is pushed to.
 *
 * So they are generated on first boot and written to the state volume. With a
 * volume, sessions survive restarts. Without one, new secrets are generated on
 * each boot and everyone is simply signed out — correct, if inconvenient, and
 * it never weakens anything.
 */
function ensureSecrets() {
  const file = join(STATE_DIR, "secrets.json");
  let stored = {};

  if (existsSync(file)) {
    try {
      stored = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      log("secrets file unreadable — generating fresh secrets");
    }
  }

  const generated = [];
  const need = {
    JWT_ACCESS_SECRET: () => randomBytes(48).toString("base64url"),
    JWT_REFRESH_SECRET: () => randomBytes(48).toString("base64url"),
    /*
     * Only ever used to create an administrator on a database that has none.
     * The baked snapshot already contains the church's accounts, so on a normal
     * boot this is generated, unused, and thrown away — it exists so the
     * production config check passes, and so an empty external database still
     * ends up with a way in.
     */
    SEED_ADMIN_PASSWORD: () => randomBytes(18).toString("base64url"),
  };

  for (const [key, make] of Object.entries(need)) {
    if (process.env[key]) continue;
    if (!stored[key]) {
      stored[key] = make();
      generated.push(key);
    }
    process.env[key] = stored[key];
  }

  if (generated.length > 0) {
    try {
      mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify(stored, null, 2), { mode: 0o600 });
      log(`generated ${generated.join(", ")} — stored in ${file}`);
    } catch (error) {
      log(
        `generated ${generated.join(", ")} in memory only ` +
          `(${STATE_DIR} is not writable: ${error.message}). ` +
          "Mount a volume there to keep sessions across restarts.",
      );
    }
  }
}

/* ---------------------------------------------------------------- database */

/** True when the URI points at the database this container runs itself. */
function isEmbeddedUri(uri) {
  return /^mongodb:\/\/(127\.0\.0\.1|localhost)(:27017)?(\/|$)/.test(uri);
}

/**
 * Whether a `mongod` binary is on PATH at all.
 *
 * The container always has one. The same entrypoint also drives the plain
 * `dist-portal/` folder on a VM, where it usually does not — and spawning a
 * command that does not exist surfaces as `ENOENT`, which says nothing about
 * what to do next. Checked up front so the failure names the fix instead.
 */
function hasMongod() {
  const probe = spawnSync("mongod", ["--version"], { stdio: "ignore" });
  return !probe.error;
}

/**
 * Start the bundled `mongod`, and resolve once it accepts connections.
 *
 * Running a database inside the application container is not how you build a
 * production system, and it is exactly right for what this image is: a whole
 * installation — content, media, accounts — that a parish can put on a ZimaOS
 * box, a Render free tier or a laptop and have working in one command. Every
 * one of those places gives you one container and no managed database.
 *
 * Bound to loopback only, so nothing outside the container can reach it. Set
 * `MONGODB_URI` to an external database and this never runs.
 */
function startEmbeddedMongo() {
  mkdirSync(MONGO_DATA_DIR, { recursive: true });

  /*
   * `--wiredTigerCacheSizeGB` is pinned to the floor on purpose. WiredTiger's
   * default is half of *host* RAM, which it reads from the machine and not from
   * the container's limit — on a 512 MB instance it happily plans for gigabytes
   * and is killed by the OOM reaper before the API finishes starting. This
   * dataset is a few hundred documents; it does not need the cache.
   *
   * 0.25 is the lowest value MongoDB accepts. Anything smaller is rejected at
   * startup, so a well-meaning `MONGO_CACHE_GB=0.1` on a tiny host would stop
   * the database booting at all — clamped here rather than left to fail.
   */
  const requestedCache = Number(process.env.MONGO_CACHE_GB ?? 0.25);
  const cacheGb = Number.isFinite(requestedCache)
    ? Math.max(0.25, requestedCache)
    : 0.25;

  const args = [
    "--dbpath", MONGO_DATA_DIR,
    "--bind_ip", "127.0.0.1",
    "--port", "27017",
    "--wiredTigerCacheSizeGB", String(cacheGb),
    "--quiet",
  ];

  log(`starting bundled MongoDB (data: ${MONGO_DATA_DIR})`);
  start("mongod", args, ROOT, {}, "mongod");

  return waitForPort(27017, 120_000);
}

/**
 * Wait for an external database's TCP port.
 *
 * A platform starts the app as soon as the container exists, not when the
 * database is ready, and the restore's first act is to connect. Without this
 * the first boot of a fresh stack races and dies, which reads as a broken build
 * rather than a slow database.
 */
async function waitForMongo(uri, timeoutMs = 90_000) {
  let host;
  let port;
  try {
    // mongodb+srv and multi-host URIs have no single port to probe; let the
    // driver's own retry handle those.
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    if (uri.startsWith("mongodb+srv") || parsed.hostname.includes(",")) return;
    host = parsed.hostname;
    port = Number(parsed.port || 27017);
  } catch {
    return;
  }

  const deadline = Date.now() + timeoutMs;
  let announced = false;

  while (Date.now() < deadline) {
    if (await probe(host, port, 3000)) {
      return log(`database reachable at ${host}:${port}`);
    }
    if (!announced) {
      log(`waiting for database at ${host}:${port}…`);
      announced = true;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error(`database at ${host}:${port} did not become reachable`);
}

/* -------------------------------------------------------------- boot steps */

/** Run a one-shot step to completion, failing the boot if it fails. */
function runStep(name, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${name} exited with code ${code}`)),
    );
    child.on("error", reject);
  });
}

/* --------------------------------------------------------------- processes */

const children = [];
let shuttingDown = false;

function start(name, args, cwd, extraEnv = {}, command = process.execPath) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    log(`${name} exited (code ${code}, signal ${signal}) — stopping`);
    shutdown(code === 0 ? 1 : (code ?? 1));
  });

  children.push({ name, child });
  return child;
}

/**
 * Stop everything, database last.
 *
 * Order matters: `mongod` must outlive the API so in-flight writes land and
 * WiredTiger closes its files cleanly. Killed alongside the others it can leave
 * the data directory needing recovery, which on the next boot looks like data
 * loss.
 */
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  const apps = children.filter((c) => c.name !== "mongod");
  const db = children.filter((c) => c.name === "mongod");

  for (const { child } of apps) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }

  setTimeout(() => {
    for (const { child } of db) {
      if (child.exitCode === null) child.kill("SIGTERM");
    }
  }, 3000).unref();

  setTimeout(() => {
    for (const { child } of children) {
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    process.exit(code);
  }, 12_000).unref();
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    log(`received ${signal}`);
    shutdown(0);
  });
}

/* ------------------------------------------------------------------ router */

/** One TCP connection attempt. Resolves true when the port answers. */
function probe(host, port, timeout) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

/** Wait for a local server to start listening. */
async function waitForPort(port, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    if (await probe("127.0.0.1", port, 2000)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startRouter() {
  const server = createServer((req, res) => {
    const toApi = API_PREFIXES.some(
      (p) => req.url === p || req.url.startsWith(`${p}/`) || req.url.startsWith(`${p}?`),
    );
    const port = toApi ? API_PORT : CMS_PORT;

    /*
     * Both apps build absolute URLs and check origins, so they need to know how
     * the request actually arrived rather than that it came from loopback.
     * Anything the client sent is preserved — a platform's proxy in front of us
     * has already set these, and overwriting would replace the real public
     * hostname with our own internal one, which is precisely what media URLs
     * are derived from.
     */
    const headers = {
      ...req.headers,
      "x-forwarded-for": req.headers["x-forwarded-for"] ?? req.socket.remoteAddress,
      "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "http",
      "x-forwarded-host": req.headers["x-forwarded-host"] ?? req.headers.host,
    };

    const upstream = httpRequest(
      { host: "127.0.0.1", port, path: req.url, method: req.method, headers },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );

    upstream.on("error", (error) => {
      if (res.headersSent) return res.destroy();
      res.writeHead(502, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          statusCode: 502,
          message: `${toApi ? "API" : "CMS"} is not reachable`,
          detail: error.message,
        }),
      );
    });

    // Streamed, not buffered: uploads and media downloads pass straight
    // through without being held in memory.
    req.pipe(upstream);
  });

  // Next's dev socket is not used in production, but a stray upgrade request
  // should be refused cleanly rather than left hanging.
  server.on("upgrade", (_req, socket) => socket.destroy());

  server.listen(PUBLIC_PORT, "0.0.0.0", () => {
    log(`listening on :${PUBLIC_PORT}`);
    log(`  API   /${process.env.API_PREFIX ?? "v1"}  and  /uploads`);
    log("  CMS   everything else");
  });

  return server;
}

/* -------------------------------------------------------------------- main */

async function main() {
  log(
    loadedEnvFile
      ? "configuration: .env loaded (real environment variables take precedence)"
      : "configuration: no .env file — reading the environment only",
  );

  /*
   * `PORT` is the public port; the API and CMS sit behind it on their own.
   * Sharing a number is a silent, confusing failure — whichever binds second
   * dies with EADDRINUSE, and the surviving half looks like a broken app.
   */
  if (!SPLIT_PORTS) {
    for (const [name, value] of [
      ["API_PORT", API_PORT],
      ["CMS_PORT", CMS_PORT],
    ]) {
      if (value === PUBLIC_PORT) {
        throw new Error(
          `PORT and ${name} are both ${value}. PORT is the public port that ` +
            `serves the CMS and the API together; ${name} is an internal port ` +
            `behind it, and they cannot be the same. Either leave ${name} unset ` +
            `(defaults: API_PORT 4000, CMS_PORT 3001) or pick a different PORT.`,
        );
      }
    }
    if (API_PORT === CMS_PORT) {
      throw new Error(`API_PORT and CMS_PORT are both ${API_PORT}; they must differ.`);
    }
  }

  const { url: publicUrl, from } = detectPublicUrl();
  process.env.PUBLIC_URL = publicUrl;
  log(`public origin: ${publicUrl} (${from})`);

  ensureSecrets();

  /*
   * Any origin, by default. The hostname this container ends up on is not
   * knowable when the image is built, and the CMS authenticates with Bearer
   * tokens rather than cookies, so there is no browser-attached credential for
   * a hostile origin to ride on. Set `CORS_ORIGINS` to lock it down once the
   * domain is settled.
   */
  process.env.CORS_ORIGINS ??= "*";
  // Explicitly off: with `CORS_ORIGINS` already open, blanket private-network
  // trust adds nothing, and the API refuses to start in production with it on.
  process.env.CORS_ALLOW_PRIVATE_NETWORK ??= "false";

  const embedded = !process.env.MONGODB_URI || isEmbeddedUri(process.env.MONGODB_URI);
  process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/csistmc-portal";

  if (embedded) {
    if (!hasMongod()) {
      throw new Error(
        "no MONGODB_URI is set and there is no `mongod` on PATH to start. " +
          "Inside the container image one is always present, so this is a bundle " +
          "running on a host without MongoDB: either install MongoDB, or point " +
          "MONGODB_URI at a database (`mongodb+srv://…` for Atlas).",
      );
    }
    if (!(await startEmbeddedMongo())) {
      throw new Error("bundled MongoDB did not start listening in time");
    }
    log("bundled MongoDB ready");
  } else {
    log("using external MONGODB_URI — bundled MongoDB not started");
    await waitForMongo(process.env.MONGODB_URI);
  }

  // Both steps run from `backend/`, which is where the API's `node_modules`
  // and its `uploads` directory are — the restore resolves the Mongo driver
  // from the first and writes media into the second.
  log("restoring snapshot…");
  await runStep("snapshot restore", ["restore-snapshot.mjs"], join(ROOT, "backend"));

  log("initializing data…");
  await runStep("initializer", [join("dist", "seed", "initialize.js")], join(ROOT, "backend"));

  // The API reads `PORT` for its own listen port, so it is given the internal
  // one explicitly — `PORT` belongs to the public router.
  log(`starting API on ${BIND}:${API_PORT}`);
  start("api", ["dist/main"], join(ROOT, "backend"), {
    PORT: String(API_PORT),
    HOST: BIND,
  });

  log(`starting CMS on ${BIND}:${CMS_PORT}`);
  start("cms", ["server.js"], join(ROOT, "frontend"), {
    PORT: String(CMS_PORT),
    HOSTNAME: BIND,
  });

  if (SPLIT_PORTS) {
    log(`SPLIT_PORTS=true — API on :${API_PORT}, CMS on :${CMS_PORT}, no router`);
    return;
  }

  const ready = await Promise.all([waitForPort(API_PORT), waitForPort(CMS_PORT)]);
  if (!ready.every(Boolean)) {
    throw new Error("API or CMS did not start listening in time");
  }

  startRouter();
}

main().catch((error) => {
  console.error(`[portal] startup failed: ${error.message}`);
  if (children.length === 0) process.exit(1);
  // Something is running — stop it in the right order, database last, rather
  // than exiting and leaving `mongod` to be SIGKILLed with its files open.
  shutdown(1);
});
