import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

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
    return intl(request);
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

export const config = {
  // Skip API routes, Next internals, and anything with a file extension
  // (this keeps /frames/*.jpg out of the locale rewrite path, and keeps the
  // revalidation webhook, sitemap.xml, robots.txt and the logo the
  // maintenance notice shows reachable while it is up).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
