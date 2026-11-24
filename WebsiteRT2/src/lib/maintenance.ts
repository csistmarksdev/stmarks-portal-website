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

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const FALLBACK = {
  en: "The website is being updated and will be back shortly. Thank you for your patience.",
  ta: "இணையதளம் புதுப்பிக்கப்படுகிறது, விரைவில் மீண்டும் கிடைக்கும். உங்கள் பொறுமைக்கு நன்றி.",
};

function backBy(until: string | undefined, locale: "en" | "ta"): string | null {
  if (!until) return null;
  const date = new Date(until);
  if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) return null;
  const when = new Intl.DateTimeFormat(locale === "ta" ? "ta-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return locale === "ta" ? `எதிர்பார்க்கப்படும் நேரம்: ${when}` : `Expected back: ${when}`;
}

/**
 * The notice itself: one self-contained page (no app code, no scripts beyond
 * a reload) so it works even while the rest of the site is being changed.
 * Both languages are shown; the one the visitor asked for comes first.
 */
export function maintenancePage(state: MaintenanceState, locale: "en" | "ta"): string {
  const message = {
    en: state.message.en.trim() || FALLBACK.en,
    ta: state.message.ta.trim() || FALLBACK.ta,
  };
  const order: ("en" | "ta")[] = locale === "ta" ? ["ta", "en"] : ["en", "ta"];
  const heading = { en: "We'll be back soon", ta: "விரைவில் மீண்டும் வருகிறோம்" };
  const blocks = order
    .map((lang) => {
      const back = backBy(state.until, lang);
      return `<section lang="${lang}">
        <h2>${escapeHtml(heading[lang])}</h2>
        <p>${escapeHtml(message[lang])}</p>
        ${back ? `<p class="back">${escapeHtml(back)}</p>` : ""}
      </section>`;
    })
    .join('<hr aria-hidden="true">');

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="30">
<title>${locale === "ta" ? "பராமரிப்பு · தூய மாற்கு ஆலயம்" : "Maintenance · CSI St. Mark's Church"}</title>
<style>
  :root { color-scheme: light dark; --brand: oklch(0.542 0.19 359); --ink: #231f26; --muted: #6b6470; --bg: #fbf8f9; --card: #fff; --line: #ece6ea; }
  @media (prefers-color-scheme: dark) { :root { --brand: oklch(0.714 0.158 355); --ink: #f3eef2; --muted: #b3aab3; --bg: #151218; --card: #1e1a21; --line: #2e2832; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
         font: 16px/1.6 system-ui, -apple-system, "Segoe UI", "Noto Sans Tamil", Roboto, sans-serif;
         color: var(--ink); background: var(--bg); }
  main { width: 100%; max-width: 560px; background: var(--card); border: 1px solid var(--line);
         border-radius: 20px; padding: 36px 32px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,.06); }
  img { width: 84px; height: 84px; object-fit: contain; margin-bottom: 12px; }
  h1 { margin: 0 0 24px; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; color: var(--brand); }
  h2 { margin: 0 0 8px; font-size: 24px; line-height: 1.3; }
  p { margin: 0; color: var(--muted); }
  .back { margin-top: 10px; font-size: 14px; color: var(--ink); }
  hr { border: 0; border-top: 1px solid var(--line); margin: 24px 0; }
  footer { margin-top: 28px; font-size: 13px; color: var(--muted); }
</style>
</head>
<body>
<main>
  <img src="/Logo1.svg" alt="" width="84" height="84">
  <h1>CSI St. Mark's Church, Madipakkam</h1>
  ${blocks}
  <footer>${locale === "ta" ? "இந்தப் பக்கம் தானாகவே புதுப்பிக்கப்படும்." : "This page refreshes by itself."}</footer>
</main>
</body>
</html>`;
}
