/* eslint-disable no-console */
/**
 * Single entrypoint for the combined Portal bundle.
 *
 * On boot it:
 *   1. waits for MongoDB to accept connections
 *   2. runs the first-run data initializer (idempotent)
 *   3. starts the API and the CMS on internal ports
 *   4. serves both from ONE public port
 *
 * Why one port
 * ------------
 * Hosting platforms give an application a single `$PORT` and route one hostname
 * to it. Two exposed ports means two apps, two URLs and CORS between them; one
 * port means the CMS and the API share an origin, so the API base is simply
 * `https://your-host/v1` and uploaded media is `https://your-host/uploads/...`.
 * That is also what makes `PUBLIC_URL` a plain origin with no port in it.
 *
 *   /v1/*       -> API
 *   /uploads/*  -> API   (uploaded media)
 *   /docs*      -> API   (Swagger, off in production unless enabled)
 *   everything else -> CMS
 *
 * Set `SPLIT_PORTS=true` to skip the router and expose the two servers
 * directly instead, for a host that can route to both.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

/**
 * Load `.env` from beside this file, if there is one.
 *
 * Hosting platforms inject configuration as real environment variables, but
 * anyone deploying to a plain VM reaches for a `.env` file — and nothing here
 * read one, so the app died on `MONGODB_URI is not set` while the value sat
 * in a file two lines away.
 *
 * Real environment variables always win, so a platform's dashboard is never
 * overridden by a stale file left in the upload.
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

const log = (msg) => console.log(`[portal] ${msg}`);

/* ---------------------------------------------------------------- database */

/**
 * Wait for the database's TCP port.
 *
 * A platform starts the app as soon as the container exists, not when the
 * database is ready, and the initializer's first act is to connect. Without
 * this the first boot of a fresh stack races and dies, which reads as a broken
 * build rather than a slow database.
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
    const reachable = await new Promise((resolve) => {
      const socket = createConnection({ host, port });
      const done = (ok) => {
        socket.destroy();
        resolve(ok);
      };
      socket.setTimeout(3000);
      socket.once("connect", () => done(true));
      socket.once("timeout", () => done(false));
      socket.once("error", () => done(false));
    });

    if (reachable) return log(`database reachable at ${host}:${port}`);
    if (!announced) {
      log(`waiting for database at ${host}:${port}…`);
      announced = true;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error(`database at ${host}:${port} did not become reachable`);
}

/* ------------------------------------------------------------- initializer */

function runInitializer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join("dist", "seed", "initialize.js")], {
      cwd: join(ROOT, "backend"),
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`initializer exited with code ${code}`)),
    );
    child.on("error", reject);
  });
}

/* --------------------------------------------------------------- processes */

const children = [];
let shuttingDown = false;

function start(name, args, cwd, extraEnv = {}) {
  const child = spawn(process.execPath, args, {
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

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }

  setTimeout(() => {
    for (const { child } of children) {
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    process.exit(code);
  }, 8000).unref();
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    log(`received ${signal}`);
    shutdown(0);
  });
}

/* ------------------------------------------------------------------ router */

/** Wait for a local server to start listening. */
async function waitForPort(port, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    const up = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port });
      const done = (ok) => {
        socket.destroy();
        resolve(ok);
      };
      socket.setTimeout(2000);
      socket.once("connect", () => done(true));
      socket.once("timeout", () => done(false));
      socket.once("error", () => done(false));
    });
    if (up) return true;
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
     * Anything the client sent is preserved — a proxy in front of us may have
     * set it already, and overwriting would lose the real protocol.
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

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Put it in a .env file beside start.mjs, or set it " +
        "in the hosting platform's environment.",
    );
  }

  /*
   * `PORT` is the public port; the API and CMS sit behind it on their own.
   * Sharing a number is a silent, confusing failure — whichever binds second
   * dies with EADDRINUSE, and the surviving half looks like a broken app. It
   * is an easy mistake because `PORT=4000` is exactly what the API used to
   * take, so say plainly what to change.
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

  await waitForMongo(uri);

  log("initializing data…");
  await runInitializer();

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
  process.exit(1);
});
