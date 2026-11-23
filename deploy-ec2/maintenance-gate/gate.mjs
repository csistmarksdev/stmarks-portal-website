#!/usr/bin/env node
/**
 * Maintenance gate for the public website.
 *
 *   node gate.mjs
 *
 * A small reverse proxy that sits in front of the Next.js website and puts it
 * behind a maintenance notice when the Portal says so — without the website
 * itself changing at all. The super admin flips the switch in the Portal
 * (System → Maintenance mode); the gate reads `GET /v1/site/status` and:
 *
 *   maintenance off  →  every request is passed through to the website
 *   maintenance on   →  visitors get a self-contained bilingual notice page
 *                       (HTTP 503 + Retry-After, so search engines come back
 *                       later instead of indexing the notice)
 *
 * Design choices:
 *
 * - Fail OPEN. If the Portal cannot be reached, or answers with something
 *   unexpected, visitors get the website. A Portal outage must never take the
 *   public site down with it.
 * - The status is cached for a few seconds, so a busy site does not ask the
 *   Portal on every request, while switching maintenance on or off still takes
 *   effect almost at once.
 * - `/api/revalidate` always passes through — the Portal calls it after a
 *   publish, and maintenance should not leave the website serving stale pages
 *   once it comes back.
 * - An optional bypass token lets the church preview the real website while
 *   it is in maintenance: open `/?gate-preview=<token>` once; a cookie keeps
 *   the preview on for that browser.
 * - No dependencies — Node's own `http` module only — so there is nothing to
 *   install or keep up to date.
 *
 * Configuration (environment variables, all optional):
 *
 *   GATE_HOST          listen address                 default 0.0.0.0
 *   GATE_PORT          public port                    default 3000
 *   UPSTREAM_URL       the website (next start)       default http://127.0.0.1:3001
 *   STATUS_URL         the Portal's status endpoint   default http://127.0.0.1:8080/v1/site/status
 *   STATUS_TTL_MS      how long a status is reused    default 5000
 *   STATUS_TIMEOUT_MS  give up on the Portal after    default 2000
 *   GATE_BYPASS_TOKEN  enables the preview bypass     default (off)
 *   GATE_PASS_PATHS    comma-separated path prefixes that always pass
 *                                                     default /api/revalidate,/favicon.ico
 *   SITE_NAME          shown on the notice            default St. Mark's Church, CSI Madipakkam
 */
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { connect } from "node:net";

const env = process.env;
const HOST = env.GATE_HOST ?? "0.0.0.0";
const PORT = Number(env.GATE_PORT ?? 3000);
const UPSTREAM = new URL(env.UPSTREAM_URL ?? "http://127.0.0.1:3001");
const STATUS_URL = env.STATUS_URL ?? "http://127.0.0.1:8080/v1/site/status";
const STATUS_TTL_MS = Number(env.STATUS_TTL_MS ?? 5000);
const STATUS_TIMEOUT_MS = Number(env.STATUS_TIMEOUT_MS ?? 2000);
const BYPASS_TOKEN = env.GATE_BYPASS_TOKEN || "";
const PASS_PATHS = (env.GATE_PASS_PATHS ?? "/api/revalidate,/favicon.ico")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);
const SITE_NAME = env.SITE_NAME ?? "St. Mark's Church, CSI Madipakkam";
const BYPASS_COOKIE = "gate_preview";

const log = (...args) => console.log(new Date().toISOString(), ...args);

/* ------------------------------------------------------------------------ */
/* Maintenance status, cached                                               */
/* ------------------------------------------------------------------------ */

let cached = { at: 0, maintenance: null };
let inflight = null;

/** Resolves to the maintenance object, or null when the Portal can't say. */
function fetchStatus() {
  return new Promise((resolve) => {
    const url = new URL(STATUS_URL);
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(url, { method: "GET", timeout: STATUS_TIMEOUT_MS }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 64_000) req.destroy();
      });
      res.on("end", () => {
        if (res.statusCode !== 200) return resolve(null);
        try {
          const parsed = JSON.parse(body);
          const m = parsed?.maintenance;
          resolve(m && typeof m.enabled === "boolean" ? m : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
    req.end();
  });
}

async function maintenance() {
  if (Date.now() - cached.at < STATUS_TTL_MS) return cached.maintenance;
  // One request to the Portal at a time, however many visitors arrive.
  inflight ??= fetchStatus().then((m) => {
    const was = cached.maintenance?.enabled ?? false;
    cached = { at: Date.now(), maintenance: m };
    inflight = null;
    if (m === null) log("status: Portal unavailable — serving the website (fail open)");
    else if (m.enabled !== was) log(`status: maintenance ${m.enabled ? "ON" : "OFF"}`);
    return m;
  });
  return inflight;
}

/* ------------------------------------------------------------------------ */
/* The notice page                                                          */
/* ------------------------------------------------------------------------ */

const escape = (text = "") =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function untilText(iso, locale) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

function noticePage(m) {
  const en = escape(m.message?.en || "The website is being updated and will be back shortly.");
  const ta = escape(m.message?.ta || "");
  const backEn = untilText(m.until, "en-IN");
  const backTa = untilText(m.until, "ta-IN");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="60">
<title>${escape(SITE_NAME)} — Under maintenance</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Tamil", sans-serif;
    background: #f7f3ee; color: #2a1d22;
  }
  main {
    max-width: 560px; width: 100%; text-align: center; background: #fffdfb;
    border-radius: 28px; padding: 40px 32px; box-shadow: 0 1px 2px rgba(60,20,30,.06), 0 12px 40px rgba(60,20,30,.10);
    border: 1px solid rgba(120,60,80,.12);
  }
  .badge {
    display: inline-block; font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
    font-weight: 600; color: #a2104f; margin-bottom: 14px;
  }
  h1 { font-family: Georgia, "Times New Roman", serif; font-weight: 600; font-size: 26px; margin: 0 0 18px; }
  p { font-size: 16px; line-height: 1.7; margin: 0 0 12px; }
  .ta { color: #5d4a52; }
  .back { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(120,60,80,.14); font-size: 14px; color: #5d4a52; }
  .back strong { color: #2a1d22; }
  @media (prefers-color-scheme: dark) {
    body { background: #1d1518; color: #f3ecee; }
    main { background: #272024; border-color: rgba(255,255,255,.08); box-shadow: none; }
    .badge { color: #f07aa8; }
    .ta, .back { color: #c9b9bf; }
    .back strong { color: #f3ecee; }
  }
</style>
</head>
<body>
<main>
  <span class="badge">Under maintenance · பராமரிப்பில்</span>
  <h1>${escape(SITE_NAME)}</h1>
  <p>${en}</p>
  ${ta ? `<p class="ta" lang="ta">${ta}</p>` : ""}
  ${
    backEn
      ? `<p class="back">Expected back: <strong>${escape(backEn)}</strong><br><span lang="ta">மீண்டும்: <strong>${escape(backTa)}</strong></span></p>`
      : ""
  }
</main>
</body>
</html>`;
}

function serveNotice(res, m) {
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  };
  // Tell crawlers when to look again — at most an hour, even when the
  // expected return is days away, so an early reopening is noticed promptly.
  const until = m.until ? Date.parse(m.until) : NaN;
  const untilSeconds = Number.isFinite(until) ? Math.ceil((until - Date.now()) / 1000) : 3600;
  headers["Retry-After"] = String(Math.min(Math.max(untilSeconds, 60), 3600));
  res.writeHead(503, headers);
  res.end(noticePage(m));
}

/* ------------------------------------------------------------------------ */
/* Pass-through                                                             */
/* ------------------------------------------------------------------------ */

function forwardedHeaders(req) {
  const headers = { ...req.headers };
  const remote = req.socket.remoteAddress ?? "";
  headers["x-forwarded-for"] = headers["x-forwarded-for"]
    ? `${headers["x-forwarded-for"]}, ${remote}`
    : remote;
  headers["x-forwarded-proto"] ??= "http";
  headers["x-forwarded-host"] ??= req.headers.host ?? "";
  return headers;
}

function proxy(req, res) {
  const upstream = httpRequest(
    {
      protocol: UPSTREAM.protocol,
      hostname: UPSTREAM.hostname,
      port: UPSTREAM.port,
      method: req.method,
      path: req.url,
      headers: forwardedHeaders(req),
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.statusMessage, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    log(`upstream error: ${error.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    }
    res.end("The website is not responding right now. Please try again in a moment.");
  });
  req.pipe(upstream);
}

/* ------------------------------------------------------------------------ */
/* Server                                                                   */
/* ------------------------------------------------------------------------ */

function hasBypass(req) {
  if (!BYPASS_TOKEN) return false;
  const cookie = req.headers.cookie ?? "";
  return cookie.split(";").some((part) => part.trim() === `${BYPASS_COOKIE}=${BYPASS_TOKEN}`);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://gate.local");

  // The gate's own health check, for systemd / monitoring.
  if (url.pathname === "/__gate/health") {
    const m = await maintenance();
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, portal: m ? "reachable" : "unreachable", maintenance: m?.enabled ?? false }));
    return;
  }

  // Preview while in maintenance: ?gate-preview=<token> sets a cookie, then redirects.
  if (BYPASS_TOKEN && url.searchParams.get("gate-preview") === BYPASS_TOKEN) {
    url.searchParams.delete("gate-preview");
    res.writeHead(302, {
      "Set-Cookie": `${BYPASS_COOKIE}=${BYPASS_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`,
      Location: url.pathname + (url.search || ""),
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (PASS_PATHS.some((prefix) => url.pathname.startsWith(prefix)) || hasBypass(req)) {
    proxy(req, res);
    return;
  }

  const m = await maintenance();
  if (m?.enabled) serveNotice(res, m);
  else proxy(req, res);
});

// WebSocket / upgrade requests (none in production today) pass straight through
// unless the site is in maintenance.
server.on("upgrade", async (req, socket, head) => {
  const m = await maintenance();
  if (m?.enabled && !hasBypass(req)) {
    socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    return;
  }
  const upstream = connect(Number(UPSTREAM.port || 80), UPSTREAM.hostname, () => {
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (const [key, value] of Object.entries(forwardedHeaders(req))) {
      for (const v of [].concat(value)) lines.push(`${key}: ${v}`);
    }
    upstream.write(lines.join("\r\n") + "\r\n\r\n");
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, HOST, () => {
  log(`maintenance gate on http://${HOST}:${PORT} → ${UPSTREAM.origin}; status from ${STATUS_URL}`);
  if (BYPASS_TOKEN) log("preview bypass enabled");
  void maintenance();
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    log(`${signal} — closing`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
