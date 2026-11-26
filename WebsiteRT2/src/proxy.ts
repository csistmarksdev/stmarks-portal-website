import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { privacyNoticeReady } from "@/content/church-office";
import { routing } from "@/i18n/routing";
import { maintenanceState, writeMaintenanceHeader } from "@/lib/maintenance";

/**
 * Next.js 16 renamed Middleware to Proxy. next-intl still ships its handler
 * as `createMiddleware`, so we adapt it to the `proxy` export the framework
 * now looks for. Behaviour is unchanged: locale negotiation and prefixing.
 */
const intl = createMiddleware(routing);

/**
 * Every page request first asks whether the Portal has the website in
 * maintenance mode (see `lib/maintenance.ts`). This runs before Next's page
 * cache, so the switch takes effect for cached pages too, within ~10 seconds.
 *
 * In maintenance, visitors get the notice with `503 Service Unavailable` and
 * `Retry-After`: search engines read that as "briefly down, come back", and
 * keep the pages they have indexed. `no-store` keeps any browser or CDN from
 * holding on to the notice once maintenance is switched off.
 */
export async function proxy(request: NextRequest) {
  const state = await maintenanceState();
  if (!state.enabled) {
    // The notice has no business being visited while the site is up — a
    // bookmark or a shared link to it goes home instead.
    const notice = request.nextUrl.pathname.match(/^\/(?:(en|ta)\/)?maintenance\/?$/);
    if (notice) {
      return NextResponse.redirect(new URL(notice[1] === "en" ? "/en" : "/", request.url), 307);
    }
    const response = intl(request);
    return isKnownPath(request.nextUrl.pathname) ? response : asNotFound(response, request);
  }

  const locale = /^\/en(?:\/|$)/.test(request.nextUrl.pathname) ? "en" : "ta";
  const backIn = state.until ? Math.ceil((Date.parse(state.until) - Date.now()) / 1000) : NaN;
  const retryAfter = Number.isFinite(backIn) && backIn > 0 ? Math.min(backIn, 86_400) : 300;

  // The notice is a page of the site (app/maintenance), drawn in its own
  // design; it is told the state and the language rather than asking again.
  const forwarded = new Headers(request.headers);
  forwarded.set("x-maintenance-state", writeMaintenanceHeader(state));
  forwarded.set("x-maintenance-locale", locale);

  return NextResponse.rewrite(new URL("/maintenance", request.url), {
    status: 503,
    request: { headers: forwarded },
    headers: {
      "cache-control": "no-store, max-age=0",
      "retry-after": String(retryAfter),
      "x-robots-tag": "noindex",
    },
  });
}

/**
 * F-052: the paths the site actually has, after the optional `/en` prefix.
 *
 * An unmatched path is caught by `[locale]/[...rest]`, which renders the
 * branded, translated 404 - but that segment streams, so Next can only send it
 * with status 200 (see the note in that file). Search engines and link checkers
 * then read every mistyped URL as a real page. The status is decided here
 * instead, before rendering: the page is the same, the status line says 404.
 *
 * Slugs are not checked here: their pages call `notFound()` themselves and
 * already answer 404. Legacy paths (`/about`, `/fellowships`, …) never get this
 * far - `next.config.ts` redirects them before the proxy runs.
 */
const KNOWN_PATHS = [
  /^$/,
  /^events(?:\/blog)?(?:\/[^/]+)?$/,
  /^fellowships\/[^/]+$/,
  /^gallery(?:\/[^/]+)?$/,
];

function isKnownPath(pathname: string): boolean {
  const rest = pathname
    .replace(/^\/(?:en|ta)(?=\/|$)/, "")
    .replace(/^\/+|\/+$/g, "");
  // The Privacy Notice exists only once the office has supplied its facts.
  if (rest === "privacy") return privacyNoticeReady();
  return KNOWN_PATHS.some((pattern) => pattern.test(rest));
}

/**
 * The same response next-intl produced, answered with 404. A redirect (e.g.
 * `/ta/x` → `/x`) is left alone so it can land first; a pass-through becomes a
 * rewrite to itself, because only a rewrite carries its status to the page.
 */
function asNotFound(response: NextResponse, request: NextRequest): NextResponse {
  if (response.headers.has("location")) return response;

  const target = response.headers.get("x-middleware-rewrite") ?? request.url;
  const notFound = NextResponse.rewrite(new URL(target, request.url), { status: 404 });
  response.headers.forEach((value, key) => {
    if (key === "x-middleware-next" || key === "x-middleware-rewrite") return;
    notFound.headers.set(key, value);
  });
  return notFound;
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension
  // (this keeps /frames/*.jpg out of the locale rewrite path, and keeps the
  // revalidation webhook, sitemap.xml, robots.txt and the logo the
  // maintenance notice shows reachable while it is up).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
