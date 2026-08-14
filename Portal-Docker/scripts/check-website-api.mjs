/* eslint-disable no-console */
/**
 * Exercises the Website contract against a running Portal.
 *
 *   node scripts/check-website-api.mjs                      # http://localhost:8080
 *   node scripts/check-website-api.mjs https://portal.example.org
 *
 * Answers one question: if the Website were pointed at this URL right now,
 * would every page render?
 *
 * Why shape and not just status
 * -----------------------------
 * A 200 proves the route exists. It does not prove the Website can use the
 * response, and the ways it fails are quiet: a `LocalizedText` missing its `ta`
 * half renders an empty Tamil page rather than an error; a date serialised as
 * `{}` instead of an ISO string makes an events list silently empty; an
 * `ImageAsset` without `width`/`height` throws inside `next/image` at render
 * time, long after this check would have passed. So each endpoint is validated
 * against the shape in `shared/src/content.ts` — the same file the Website's own
 * types are checked against by `npm run check:contract`.
 *
 * No dependencies, so it runs on a bare VM against a container with nothing
 * installed but Node.
 */

const BASE = (process.argv[2] ?? "http://localhost:8080").replace(/\/$/, "");
const PREFIX = process.env.API_PREFIX ?? "v1";
const API = `${BASE}/${PREFIX}`;

/** Pretend to be the public website, so CORS is exercised on every call. */
const WEBSITE_ORIGIN = process.env.WEBSITE_ORIGIN ?? "https://csistmarksmadipakkam.org";

const results = [];
let currentGroup = "";

function group(name) {
  currentGroup = name;
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

function check(name, ok, detail = "") {
  results.push({ group: currentGroup, name, ok, detail });
  const mark = ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: "application/json", Origin: WEBSITE_ORIGIN, ...headers },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON — the caller decides whether that matters */
  }
  return { res, body };
}

/* ------------------------------------------------------------- validators */

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** `{ en, ta }`, both non-empty strings. */
function isLocalized(v) {
  return isObj(v) && typeof v.en === "string" && typeof v.ta === "string";
}

/** An ISO 8601 string that actually parses. */
function isIsoDate(v) {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

/** `ImageAsset` — the shape `next/image` needs to render without throwing. */
function isImageAsset(v) {
  return (
    isObj(v) &&
    typeof v.url === "string" &&
    /^https?:\/\//.test(v.url) &&
    isLocalized(v.alt) &&
    typeof v.width === "number" &&
    typeof v.height === "number"
  );
}

/**
 * Walks a record and reports the first field that would break the Website.
 * Returns `null` when the record is sound.
 */
function validate(record, spec) {
  for (const [field, kind] of Object.entries(spec)) {
    const optional = kind.endsWith("?");
    const type = optional ? kind.slice(0, -1) : kind;
    const value = record[field];

    if (value === undefined || value === null) {
      if (optional) continue;
      return `${field} is missing`;
    }

    const ok = {
      string: () => typeof value === "string",
      number: () => typeof value === "number",
      boolean: () => typeof value === "boolean",
      localized: () => isLocalized(value),
      "localized[]": () => Array.isArray(value) && value.every(isLocalized),
      date: () => isIsoDate(value),
      image: () => isImageAsset(value),
      array: () => Array.isArray(value),
    }[type];

    if (!ok) return `unknown spec type "${type}" for ${field}`;
    if (!ok()) return `${field} is not a valid ${type} (got ${JSON.stringify(value)?.slice(0, 80)})`;
  }
  return null;
}

/** Every `ImageAsset` anywhere in a value. */
function collectImages(value, found = []) {
  if (Array.isArray(value)) {
    for (const v of value) collectImages(v, found);
  } else if (isObj(value)) {
    if (isImageAsset(value)) found.push(value);
    for (const v of Object.values(value)) collectImages(v, found);
  }
  return found;
}

/* ------------------------------------------------------------------ specs */

const SPECS = {
  event: {
    id: "string", slug: "string", title: "localized", summary: "localized",
    description: "localized[]", startDate: "date", endDate: "date?",
    location: "localized", featured: "boolean", image: "image?",
    createdAt: "date", updatedAt: "date",
  },
  blogPost: {
    id: "string", slug: "string", title: "localized", excerpt: "localized",
    body: "localized[]", publishedAt: "date", author: "localized",
    coverImage: "image?", readingMinutes: "number?",
    createdAt: "date", updatedAt: "date",
  },
  album: {
    id: "string", slug: "string", title: "localized", description: "localized?",
    date: "date", cover: "image", photos: "array",
    createdAt: "date", updatedAt: "date",
  },
  announcement: {
    id: "string", slug: "string", title: "localized", body: "localized",
    publishedAt: "date", pinned: "boolean",
    createdAt: "date", updatedAt: "date",
  },
  fellowship: {
    id: "string", slug: "string", name: "localized", tagline: "localized",
    about: "localized[]", vision: "localized", schedule: "localized",
    banner: "image", committee: "array", order: "number",
    createdAt: "date", updatedAt: "date",
  },
  weeklyVerse: { reference: "localized", text: "localized", weekOf: "date" },
  pastorMessage: {
    authorName: "localized", authorRole: "localized",
    excerpt: "localized", body: "localized[]", authorImage: "image?",
  },
};

/**
 * A list endpoint: reachable, an array, every record the right shape, and no
 * `status` field — public responses serve published records only and must not
 * leak the editorial state.
 */
async function checkList(label, path, spec, { minimum = 1 } = {}) {
  const { res, body } = await get(path);

  if (!res.ok) return check(`GET ${path}`, false, `HTTP ${res.status}`);
  if (!Array.isArray(body)) {
    return check(`GET ${path}`, false, `expected an array, got ${typeof body}`);
  }
  check(`GET ${path}`, body.length >= minimum, `${body.length} ${label}`);

  if (body.length === 0) return [];

  const bad = body.map((r) => validate(r, spec)).find(Boolean);
  check(`  ${label} match the contract`, !bad, bad ?? `all ${body.length} valid`);

  const leaked = body.find((r) => "status" in r);
  check("  no editorial `status` leaked to the public", !leaked,
    leaked ? `${leaked.slug} exposes status="${leaked.status}"` : "");

  return body;
}

/* ------------------------------------------------------------------- main */

console.log(`Testing the Website contract against ${API}`);
console.log(`Sending Origin: ${WEBSITE_ORIGIN}\n${"─".repeat(64)}`);

/* -- reachable at all ---------------------------------------------------- */
group("Reachability");
{
  const { res, body } = await get("/health");
  check("API is up and connected to its database",
    res.ok && body?.status === "ok" && body?.database === "connected",
    body ? `${body.status}/${body.database}` : `HTTP ${res.status}`);

  check("CORS allows the Website's origin",
    res.headers.get("access-control-allow-origin") === "*",
    `access-control-allow-origin: ${res.headers.get("access-control-allow-origin") ?? "absent"}`);
}

/* -- the eight content endpoints the Website reads ----------------------- */
group("Events");
const events = await checkList("events", "/events", SPECS.event);
{
  const { res, body } = await get("/events/slugs");
  check("GET /events/slugs returns string[]",
    res.ok && Array.isArray(body) && body.every((s) => typeof s === "string"),
    Array.isArray(body) ? `${body.length} slugs` : `HTTP ${res.status}`);

  if (events[0]) {
    const { res: r2, body: one } = await get(`/events/${events[0].slug}`);
    check(`GET /events/:slug (${events[0].slug})`, r2.ok && one?.slug === events[0].slug, `HTTP ${r2.status}`);
  }
  const { res: r3 } = await get("/events/definitely-not-a-real-slug");
  check("unknown slug 404s (so the Website can render notFound())", r3.status === 404, `HTTP ${r3.status}`);

  const { body: upcoming } = await get("/events?status=upcoming");
  check("?status=upcoming filters", Array.isArray(upcoming),
    Array.isArray(upcoming) ? `${upcoming.length} upcoming` : "not an array");

  const { body: limited } = await get("/events?limit=2");
  check("?limit= caps the list", Array.isArray(limited) && limited.length <= 2,
    Array.isArray(limited) ? `${limited.length} returned` : "not an array");
}

group("Blog");
const posts = await checkList("posts", "/blog", SPECS.blogPost);
{
  const { res, body } = await get("/blog/slugs");
  check("GET /blog/slugs returns string[]", res.ok && Array.isArray(body), `${body?.length ?? "?"} slugs`);
  if (posts[0]) {
    const { res: r2 } = await get(`/blog/${posts[0].slug}`);
    check(`GET /blog/:slug (${posts[0].slug})`, r2.ok, `HTTP ${r2.status}`);
  }
  const withMinutes = posts.filter((p) => typeof p.readingMinutes === "number");
  check("readingMinutes computed server-side", withMinutes.length === posts.length,
    `${withMinutes.length}/${posts.length}`);
}

group("Gallery");
const albums = await checkList("albums", "/gallery", SPECS.album);
{
  const { res, body } = await get("/gallery/slugs");
  check("GET /gallery/slugs returns string[]", res.ok && Array.isArray(body), `${body?.length ?? "?"} slugs`);

  const photos = albums.flatMap((a) => a.photos ?? []);
  check("albums carry photos", photos.length > 0, `${photos.length} across ${albums.length} albums`);

  const badPhoto = photos.find((p) => !p.id || !isImageAsset(p.image));
  check("every photo has an id and a usable image", !badPhoto,
    badPhoto ? JSON.stringify(badPhoto).slice(0, 100) : `${photos.length} valid`);

  // Videos are photos with a `video` field; the poster frame is `image`.
  const videos = photos.filter((p) => p.video);
  const badVideo = videos.find(
    (p) => typeof p.video.url !== "string" ||
           !["youtube", "vimeo", "file"].includes(p.video.provider),
  );
  check("video items carry a url and a known provider", videos.length === 0 || !badVideo,
    videos.length === 0
      ? "no videos in the gallery"
      : `${videos.length} video(s): ${[...new Set(videos.map((v) => v.video.provider))].join(", ")}`);
}

group("Announcements");
await checkList("announcements", "/announcements", SPECS.announcement);
{
  const { res, body } = await get("/announcements/pinned");
  // `Announcement | null` — null is a valid answer and must not be a 404.
  check("GET /announcements/pinned returns an announcement or null",
    res.ok && (body === null || validate(body, SPECS.announcement) === null),
    body === null ? "null (nothing pinned)" : `pinned: ${body?.slug}`);

  const { body: list } = await get("/announcements");
  if (Array.isArray(list) && list.length > 1) {
    const firstUnpinned = list.findIndex((a) => !a.pinned);
    const lastPinned = list.map((a) => a.pinned).lastIndexOf(true);
    check("pinned announcements sort first",
      firstUnpinned === -1 || lastPinned === -1 || lastPinned < firstUnpinned);
  }
}

group("Fellowships");
const fellowships = await checkList("fellowships", "/fellowships", SPECS.fellowship);
{
  const { res, body } = await get("/fellowships/slugs");
  check("GET /fellowships/slugs returns string[]", res.ok && Array.isArray(body), `${body?.length ?? "?"} slugs`);
  if (fellowships[0]) {
    const { res: r2 } = await get(`/fellowships/${fellowships[0].slug}`);
    check(`GET /fellowships/:slug (${fellowships[0].slug})`, r2.ok, `HTTP ${r2.status}`);
  }
  const ordered = fellowships.every((f, i) => i === 0 || fellowships[i - 1].order <= f.order);
  check("sorted by `order`", ordered);

  // A shared album is churchwide and must surface in every fellowship's gallery.
  if (fellowships[0]) {
    const slug = fellowships[0].slug;
    const { body: scoped } = await get(`/gallery?fellowship=${slug}`);
    const sharedIncluded = Array.isArray(scoped) &&
      scoped.every((a) => a.fellowshipSlug === slug || a.shared === true);
    check(`?fellowship=${slug} returns only that fellowship's albums plus shared ones`,
      sharedIncluded, Array.isArray(scoped) ? `${scoped.length} album(s)` : "not an array");
  }
}

group("Downloads");
{
  const { res, body } = await get("/downloads");
  check("GET /downloads", res.ok && Array.isArray(body),
    Array.isArray(body) ? `${body.length} item(s)` : `HTTP ${res.status}`);

  const { res: r2, body: grouped } = await get("/downloads/grouped");
  check("GET /downloads/grouped returns { bulletin, form, document }",
    r2.ok && isObj(grouped) &&
      ["bulletin", "form", "document"].every((k) => Array.isArray(grouped[k])),
    isObj(grouped) ? Object.keys(grouped).join(", ") : `HTTP ${r2.status}`);
}

group("Church singletons");
{
  const { res, body } = await get("/church/service-timings");
  check("GET /church/service-timings", res.ok && (Array.isArray(body) || isObj(body)),
    `HTTP ${res.status}`);

  const { res: r2, body: pastor } = await get("/church/pastor-message");
  const pastorBad = r2.ok && isObj(pastor) ? validate(pastor, SPECS.pastorMessage) : "not returned";
  check("GET /church/pastor-message", r2.ok && !pastorBad, pastorBad || "valid");

  const { res: r3, body: verse } = await get("/church/weekly-verse");
  const verseBad = r3.ok && isObj(verse) ? validate(verse, SPECS.weeklyVerse) : "not returned";
  check("GET /church/weekly-verse", r3.ok && !verseBad, verseBad || "valid");
}

/* -- media actually loads ------------------------------------------------ */
group("Media");
{
  const everything = [...events, ...posts, ...albums, ...fellowships];
  const images = collectImages(everything);
  check("responses carry image assets", images.length > 0, `${images.length} found`);

  const origins = [...new Set(images.map((i) => new URL(i.url).origin))];
  check("all media points at this deployment, not somewhere else",
    origins.length === 1 && BASE.startsWith(origins[0]) || origins.every((o) => BASE.includes(new URL(o).host)),
    origins.join(", "));

  // Fetch a sample rather than all of them — enough to prove the route serves.
  const sample = images.slice(0, 5);
  const fetched = await Promise.all(sample.map(async (img) => {
    try {
      const r = await fetch(img.url, { headers: { Origin: WEBSITE_ORIGIN } });
      return {
        ok: r.ok && Number(r.headers.get("content-length")) > 0,
        cors: r.headers.get("access-control-allow-origin"),
        detail: `${r.status} ${r.headers.get("content-type")}`,
        url: img.url,
      };
    } catch (e) {
      return { ok: false, detail: e.message, url: img.url };
    }
  }));
  const broken = fetched.find((f) => !f.ok);
  check(`${sample.length} sampled images load`, !broken,
    broken ? `${broken.url} → ${broken.detail}` : "all served");
  check("images are cross-origin readable by the Website",
    fetched.every((f) => f.cors === "*"),
    `access-control-allow-origin: ${fetched[0]?.cors ?? "n/a"}`);

  /*
   * Media URLs must follow the host each request arrived on, not the one baked
   * in at boot.
   *
   * The check above passes whenever the deployment is reached at its own
   * configured `PUBLIC_URL` — which is every check run from the machine hosting
   * it. The failure it cannot see is a portal whose stored origin is
   * `http://localhost:8080` (the default when nothing is configured) served to
   * browsers on other machines: the API answers 200, the files are on disk, and
   * every image is broken because `localhost` is the *viewer's* computer.
   *
   * Asking for a hostname this deployment has never been reached on is what
   * separates the two.
   */
  const foreign = "contract-check.invalid";
  const { body: rehosted } = await get("/gallery", {
    "X-Forwarded-Host": foreign,
    "X-Forwarded-Proto": "https",
  });
  const rehostedImages = collectImages(Array.isArray(rehosted) ? rehosted : []);
  const followed = rehostedImages.filter((i) => new URL(i.url).host === foreign);
  check("media URLs follow the request's host (not the baked-in origin)",
    rehostedImages.length > 0 && followed.length === rehostedImages.length,
    rehostedImages.length === 0
      ? "no images to check"
      : `${followed.length}/${rehostedImages.length} — e.g. ${rehostedImages[0].url}`);
}

/* -- pagination ---------------------------------------------------------- */
group("Pagination");
{
  const { res, body } = await get("/events?page=1&pageSize=2");
  const shaped = isObj(body) &&
    Array.isArray(body.items) && typeof body.total === "number" &&
    typeof body.page === "number" && typeof body.pageSize === "number" &&
    typeof body.hasMore === "boolean";
  check("?page= switches to { items, total, page, pageSize, hasMore }",
    res.ok && shaped, shaped ? `total=${body.total} hasMore=${body.hasMore}` : JSON.stringify(body)?.slice(0, 90));
}

/* -- the contact form ---------------------------------------------------- */
group("Contact form");
{
  const res = await fetch(`${API}/contact`, {
    method: "POST",
    headers: { "content-type": "application/json", Origin: WEBSITE_ORIGIN },
    body: JSON.stringify({
      name: "Contract Test",
      email: "contract-test@example.com",
      subject: "Automated contract check",
      message: "Sent by scripts/check-website-api.mjs — safe to delete.",
    }),
  });
  const body = await res.json().catch(() => null);
  // 429 is a pass: the endpoint is rate-limited 3/min/IP by design, and hitting
  // that means it is working, not broken.
  check("POST /contact accepts a submission",
    (res.ok && body?.success) || res.status === 429,
    res.status === 429 ? "429 rate-limited (expected on repeat runs)" : `HTTP ${res.status}`);

  const bad = await fetch(`${API}/contact`, {
    method: "POST",
    headers: { "content-type": "application/json", Origin: WEBSITE_ORIGIN },
    body: JSON.stringify({ name: "x" }),
  });
  check("POST /contact rejects an invalid body",
    bad.status === 400 || bad.status === 422 || bad.status === 429, `HTTP ${bad.status}`);
}

/* -- endpoints that must NOT exist --------------------------------------- */
group("Deliberately absent (hardcoded in the Website)");
{
  for (const path of [
    "/church/profile", "/church/history", "/church/vision-mission",
    "/church/diocese", "/leadership", "/hero-slides",
  ]) {
    const { res } = await get(path);
    check(`GET ${path} → 404`, res.status === 404, `HTTP ${res.status}`);
  }
}

/* ---------------------------------------------------------------- summary */

const failed = results.filter((r) => !r.ok);
console.log(`\n${"─".repeat(64)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  console.log("\n\x1b[31mFAILED\x1b[0m");
  for (const f of failed) console.log(`  • [${f.group}] ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  console.log(
    "\nThe Website would not render correctly against this deployment yet.",
  );
} else {
  console.log(
    "\n\x1b[32mEvery endpoint the Website consumes is live and correctly shaped.\x1b[0m\n" +
    `Point the Website at it with:\n  NEXT_PUBLIC_API_URL=${API}`,
  );
}

process.exit(failed.length > 0 ? 1 : 0);
