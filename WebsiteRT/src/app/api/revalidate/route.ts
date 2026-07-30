import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand revalidation, called by the Portal after it publishes.
 *
 * Why this has to exist
 * --------------------
 * Every service caches its fetch for `revalidate: 300`, and each URL is its own
 * cache entry. So `/gallery` and `/gallery/<slug>` expire independently: rename
 * an album in the Portal and the index can show the new title for minutes while
 * the album's own page still shows the old one. Two pages disagreeing about the
 * same record is worse than both being briefly stale, and no amount of tuning
 * the TTL fixes it — only invalidating on the edit does.
 *
 * `{ expire: 0 }` rather than `"max"`
 * -----------------------------------
 * `"max"` marks the tag stale and serves stale-while-revalidate, so the first
 * visitor after a publish still sees the old content. An editor who just hit
 * Publish and reloads would conclude it had not worked. The Next docs name
 * `{ expire: 0 }` as the form for exactly this case — an external system
 * calling a Route Handler that needs data gone immediately. (`updateTag` is the
 * Server Action equivalent and is not usable from here.)
 */

/** The tags the services attach to their fetches — see `src/services/*`. */
const KNOWN_TAGS = [
  "events",
  "blog",
  "gallery",
  "announcements",
  "downloads",
  "fellowships",
  "church",
] as const;

type KnownTag = (typeof KNOWN_TAGS)[number];

function isKnownTag(value: string): value is KnownTag {
  return (KNOWN_TAGS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;

  /*
   * Refuse rather than run unauthenticated. Without a secret this endpoint
   * lets anyone on the internet dump the cache repeatedly, which is a cheap way
   * to hammer the API behind it.
   */
  if (!secret) {
    return NextResponse.json(
      { revalidated: false, error: "REVALIDATE_SECRET is not configured" },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("x-revalidate-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /i, "");

  if (provided !== secret) {
    return NextResponse.json(
      { revalidated: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { tags?: unknown };
  try {
    body = (await request.json()) as { tags?: unknown };
  } catch {
    return NextResponse.json(
      { revalidated: false, error: "Body must be JSON" },
      { status: 400 },
    );
  }

  // No tags means "the Portal changed something, but did not say what".
  const requested = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string")
    : [...KNOWN_TAGS];

  const tags = requested.filter(isKnownTag);
  const unknown = requested.filter((tag) => !isKnownTag(tag));

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({
    revalidated: true,
    tags,
    // Reported rather than ignored, so a typo in the Portal's call is visible
    // instead of silently doing nothing.
    ...(unknown.length > 0 ? { ignored: unknown } : {}),
    now: Date.now(),
  });
}
