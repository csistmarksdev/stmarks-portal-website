import { NextResponse, type NextRequest } from "next/server";

/**
 * Contact form → Portal, on the server (F-009, F-068).
 *
 * The form used to `fetch("http://129.225.110.39/v1/contact")` from the
 * browser. On an HTTPS page that is active mixed content, so browsers blocked
 * it and every message and prayer request was silently lost. The browser now
 * posts to this same-origin route, and the server forwards the message.
 *
 * - Target: `CONTACT_API_URL`, else `NEXT_PUBLIC_API_URL`, + `/contact`.
 * - With `REQUIRE_HTTPS_API=1` a plain-HTTP target is refused, so once the
 *   Portal is behind TLS (team/build/ops-steps.md) the message can never again
 *   leave the server unencrypted.
 * - Spam: a honeypot field, server-side length limits and a best-effort
 *   per-visitor rate limit. The rate limit is per server instance (memory), so
 *   it is a speed bump, not a wall; the Portal keeps its own throttle.
 */

const LIMITS = {
  name: 120,
  email: 254,
  phone: 32,
  subject: 200,
  message: 5000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function target(): URL | null {
  const base = process.env.CONTACT_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const url = new URL("contact", base.endsWith("/") ? base : `${base}/`);
    if (url.protocol !== "https:" && process.env.REQUIRE_HTTPS_API === "1") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function reply(success: boolean, messageKey: string, status = 200) {
  return NextResponse.json({ success, messageKey }, { status });
}

function field(body: Record<string, unknown>, key: keyof typeof LIMITS) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply(false, "error", 400);
  }

  // Honeypot: real visitors never see or fill this field. Pretend success so
  // a bot learns nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return reply(true, "success");
  }

  const values = {
    name: field(body, "name"),
    email: field(body, "email"),
    phone: field(body, "phone"),
    subject: field(body, "subject"),
    message: field(body, "message"),
  };

  const tooLong = (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).some(
    (key) => values[key].length > LIMITS[key],
  );
  if (
    tooLong ||
    !values.name ||
    !EMAIL_PATTERN.test(values.email) ||
    !values.subject ||
    values.message.length < 10
  ) {
    return reply(false, "error", 422);
  }

  const visitor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(visitor)) return reply(false, "error", 429);

  const url = target();
  if (!url) return reply(false, "notConnected", 503);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ...values,
        phone: values.phone || undefined,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[contact] Portal answered ${response.status}`);
      return reply(false, "error", 502);
    }

    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
      messageKey?: string;
    } | null;

    return reply(result?.success ?? true, result?.messageKey ?? "success");
  } catch (error) {
    // F-090: never swallow silently - this is the log the office will need.
    console.error("[contact] forwarding failed", error);
    return reply(false, "error", 502);
  }
}
