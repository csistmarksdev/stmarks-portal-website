/**
 * Maintenance mode, as switched in the Portal (Settings → Maintenance).
 *
 * The Portal serves the switch at `GET /v1/site/status` (never cached on its
 * side). `proxy.ts` asks it before any page is served — ahead of Next's page
 * cache — so a cached page can never keep showing once maintenance is on, and
 * the notice can never linger once it is off.
 *
 * Designed not to get stuck:
 *  - the answer is remembered for 10 seconds per server instance, so a switch
 *    in the Portal takes effect within about 10 seconds either way;
 *  - if the Portal cannot be reached, the last answer is used for up to two
 *    minutes (no flicker on a blip), and after that the site is shown — a
 *    Portal outage must never lock visitors out of the website;
 *  - the notice is sent `no-store`, so no browser or CDN keeps it, and it
 *    reloads itself every 30 seconds, bringing visitors back on its own.
 *
 * The notice itself is a page of the site (`app/maintenance`), drawn in the
 * site's own design; the proxy rewrites to it.
 */

export interface MaintenanceState {
  enabled: boolean;
  message: { en: string; ta: string };
  /** ISO time the site is expected back, if the Portal gave one. */
  until?: string;
}

const FRESH_MS = 10_000;
const STALE_OK_MS = 120_000;
const TIMEOUT_MS = 2_500;

const OFF: MaintenanceState = { enabled: false, message: { en: "", ta: "" } };

let known: { state: MaintenanceState; at: number } | null = null;
let pending: Promise<MaintenanceState> | null = null;

function statusUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  return base ? `${base}/site/status` : null;
}

async function fetchState(url: string): Promise<MaintenanceState> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const body = (await res.json()) as { maintenance?: Partial<MaintenanceState> };
  const m = body.maintenance;
  return {
    enabled: m?.enabled === true,
    message: {
      en: typeof m?.message?.en === "string" ? m.message.en : "",
      ta: typeof m?.message?.ta === "string" ? m.message.ta : "",
    },
    ...(typeof m?.until === "string" ? { until: m.until } : {}),
  };
}

/** Whether the website is in maintenance — never throws. */
export async function maintenanceState(): Promise<MaintenanceState> {
  const url = statusUrl();
  if (!url) return OFF; // no Portal configured (mock data): never in maintenance

  const now = Date.now();
  if (known && now - known.at < FRESH_MS) return known.state;

  // One request at a time per instance, however many visitors arrive at once.
  pending ??= fetchState(url)
    .then((state) => {
      known = { state, at: Date.now() };
      return state;
    })
    .catch(() => (known && Date.now() - known.at < STALE_OK_MS ? known.state : OFF))
    .finally(() => {
      pending = null;
    });
  return pending;
}

/**
 * Hands the state from the proxy to the notice page in a request header.
 * Header values are bytes, not text, so the bilingual message travels
 * URL-encoded.
 */
export function writeMaintenanceHeader(state: MaintenanceState): string {
  return encodeURIComponent(JSON.stringify(state));
}

/** The page's side of {@link writeMaintenanceHeader}; anything unreadable is the default notice. */
export function readMaintenanceHeader(value: string | null): MaintenanceState {
  try {
    const parsed = JSON.parse(decodeURIComponent(value ?? "")) as Partial<MaintenanceState>;
    return {
      enabled: true,
      message: {
        en: typeof parsed.message?.en === "string" ? parsed.message.en : "",
        ta: typeof parsed.message?.ta === "string" ? parsed.message.ta : "",
      },
      ...(typeof parsed.until === "string" ? { until: parsed.until } : {}),
    };
  } catch {
    return { enabled: true, message: { en: "", ta: "" } };
  }
}
