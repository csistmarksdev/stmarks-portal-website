/**
 * Bring the previous website's content (csistmarks.com) into the Portal.
 *
 *   node --import ./scripts/ts-resolve-hook.mjs scripts/import-legacy-site.mjs
 *        (no flags)          dry run: read the live Portal, print what would change
 *        --apply             make the changes
 *        --publish           with --apply: publish new albums and downloads
 *                            straight away instead of leaving them as drafts
 *        --replace-timings   with --apply: overwrite the service timings even
 *                            though some live rows are not known placeholders
 *
 * What it moves, and where it came from, is set out in
 * docs/legacy-site-migration.md. In short:
 *
 *  - Fellowship text (src/data/fellowships.mock.ts). A field is written only
 *    while the live value is still a placeholder - the Portal's own seed text,
 *    or the invented sample that migrate-to-portal.mjs copied in from the old
 *    mock (snapshotted in legacy-site/prev-mock-fellowships.json). Anything a
 *    person has typed into the Portal is left exactly as it is and reported.
 *  - Service timings (src/data/church.mock.ts). A singleton, so all or
 *    nothing: replaced only when every live row is a known placeholder, or
 *    when --replace-timings says so.
 *  - The photo archive, the video album and the two membership forms
 *    (legacy-site/archive.json). Each file is fetched from the old site and
 *    uploaded into the Portal's media library, so nothing on the new site
 *    depends on the old server staying up. Albums and downloads are created
 *    as drafts by default: the office should look through them - several
 *    show children - before they go public.
 *
 * Idempotent: albums and downloads are matched by slug and skipped when they
 * exist; uploads are cached by source URL in node_modules/.cache, so an
 * interrupted run resumes without uploading anything twice.
 *
 * Not moved, on purpose: the "Marg Malar" magazines (marked "For Private
 * Circulation only", and full of members' birthdays, anniversaries, home
 * addresses and phone numbers), the birthday and anniversary calendar, the
 * sermon recordings (the Portal does not store audio), the 2017–18 event
 * listings and the building-fund appeal. See the doc for each reason.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const API = (process.env.PORTAL_API_URL ?? "http://localhost:4000/v1").replace(/\/$/, "");
const EMAIL = process.env.PORTAL_ADMIN_EMAIL;
const PASSWORD = process.env.PORTAL_ADMIN_PASSWORD;

const APPLY = process.argv.includes("--apply");
const PUBLISH = process.argv.includes("--publish");
const REPLACE_TIMINGS = process.argv.includes("--replace-timings");

/** Photos per POST /admin/gallery/:id/photos - keeps each request small. */
const PHOTO_BATCH = 20;

/**
 * The old host sits behind ModSecurity, which answers 406 to anything that
 * does not look like a browser. These are the headers a browser sends.
 */
const LEGACY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/*,application/pdf,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const archive = JSON.parse(readFileSync(path.join(here, "legacy-site/archive.json"), "utf8"));
const prevMock = JSON.parse(
  readFileSync(path.join(here, "legacy-site/prev-mock-fellowships.json"), "utf8"),
);

/* -------------------------------------------------------------------------- */
/* Reporting                                                                  */
/* -------------------------------------------------------------------------- */

const tally = { written: 0, kept: 0, skipped: 0, failed: 0 };
const log = {
  section: (name) => console.log(`\n\x1b[1m${name}\x1b[0m`),
  write: (what) => { tally.written++; console.log(`  \x1b[32m+\x1b[0m ${what}${APPLY ? "" : " [dry run]"}`); },
  keep: (what) => { tally.kept++; console.log(`  \x1b[36m=\x1b[0m ${what}`); },
  skip: (what) => { tally.skipped++; console.log(`  \x1b[90m·\x1b[0m ${what}`); },
  fail: (what, error) => {
    tally.failed++;
    console.log(`  \x1b[31m!\x1b[0m ${what}\n      ${error?.message ?? error}`);
  },
};

/* -------------------------------------------------------------------------- */
/* HTTP                                                                       */
/* -------------------------------------------------------------------------- */

let accessToken = "";

async function request(method, route, body) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = payload?.message ?? payload?.error ?? `${response.status} ${response.statusText}`;
    throw new Error(
      `${method} ${route} → ${response.status}: ${Array.isArray(detail) ? detail.join("; ") : detail}`,
    );
  }
  return payload;
}

const itemsOf = (list) => (Array.isArray(list) ? list : list?.items ?? []);

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

const cacheDir = path.join(projectRoot, "node_modules/.cache");
const cacheFile = path.join(cacheDir, `legacy-import-${new URL(API).host}.json`);
const uploadCache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};

function saveCache() {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(uploadCache, null, 2));
}

/** Downloads a file from the old site and stores it in the Portal's library. */
async function uploadFromLegacy(sourceUrl, alt, nameHint) {
  if (uploadCache[sourceUrl]) return uploadCache[sourceUrl];

  const response = await fetch(sourceUrl, { headers: LEGACY_HEADERS });
  if (!response.ok) throw new Error(`fetch ${sourceUrl} → ${response.status}`);

  // The old host answers a missing file with its HTML 404 page and a 200 on
  // some paths - trust the extension's type only if the body agrees.
  const ext = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  const type = MIME_BY_EXTENSION[ext];
  if (!type) throw new Error(`no MIME type known for ${sourceUrl}`);
  const served = response.headers.get("content-type") ?? "";
  if (served.startsWith("text/html")) throw new Error(`${sourceUrl} served HTML, not a file`);

  const form = new FormData();
  form.append("file", new Blob([await response.arrayBuffer()], { type }), path.basename(sourceUrl));
  if (alt) {
    form.append("altEn", alt.en ?? "");
    form.append("altTa", alt.ta ?? "");
  }
  if (nameHint) form.append("nameHint", nameHint);

  const upload = await fetch(`${API}/admin/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!upload.ok) throw new Error(`upload ${sourceUrl} → ${upload.status} ${await upload.text()}`);

  const media = await upload.json();
  uploadCache[sourceUrl] = media;
  saveCache();
  return media;
}

async function posterFor(videoUrl) {
  const key = `poster:${videoUrl}`;
  if (uploadCache[key]) return uploadCache[key];
  const media = await request("POST", "/admin/media/video-poster", { url: videoUrl });
  uploadCache[key] = media;
  saveCache();
  return media;
}

function imageAsset(media, alt) {
  return {
    url: media.url,
    alt,
    width: media.width ?? 1600,
    height: media.height ?? 900,
    ...(media.blurDataURL ? { blurDataURL: media.blurDataURL } : {}),
  };
}

function numberedAlt(alt, n) {
  return { en: `${alt.en} - photo ${n}`, ta: `${alt.ta} - புகைப்படம் ${n}` };
}

/* -------------------------------------------------------------------------- */
/* Placeholder detection                                                      */
/* -------------------------------------------------------------------------- */

/** What the Portal's own seed (Portal/backend/src/seed/seed.ts) writes. */
const SEED = {
  taglines: new Set([
    "Growing together in faith",
    "Building Christ-centred homes",
    "Little hearts, strong roots",
    "Worship through song",
    "Serving with grace",
    "Standing firm in the Lord",
    "Devoted to prayer",
    "Every member has a place",
  ]),
  about: /^The .+ of CSI St\. Mark's Church, Madipakkam\.$/,
  vision: "To glorify God in all we do.",
  schedule: "Every Sunday, 4:00 PM",
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const enOf = (value) => value?.en ?? "";

/** True when the live value of `field` is still sample text nobody has edited. */
function isPlaceholder(field, live, slug) {
  const prev = prevMock[slug] ?? {};
  switch (field) {
    case "tagline":
      return !live || SEED.taglines.has(enOf(live)) || same(live, prev.tagline);
    case "about":
      return (
        !live?.length ||
        live.every((p) => SEED.about.test(enOf(p))) ||
        same(live, prev.about)
      );
    case "vision":
      return !live || enOf(live) === SEED.vision || same(live, prev.vision);
    case "schedule":
      return !live || same(live, prev.schedule) ||
        (enOf(live) === SEED.schedule && live.ta === "ஒவ்வொரு ஞாயிறு, மாலை 4:00");
    case "memberCount":
      return live === undefined || live === null || live === prev.memberCount;
    case "committee":
      return (
        !live?.length ||
        same(live.map((m) => enOf(m.name)), prev.committeeNames)
      );
    case "coordinator": {
      const name = enOf(live?.name);
      const bare = !live?.phone && !live?.email;
      return !live || (bare && name === "Church Office") || name === prev.coordinatorName;
    }
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Fellowships                                                                */
/* -------------------------------------------------------------------------- */

const FELLOWSHIP_FIELDS = [
  "tagline", "about", "vision", "schedule", "memberCount", "committee", "coordinator",
];

async function importFellowships(fellowships) {
  log.section(`Fellowships (${fellowships.length})`);

  const admin = APPLY ? itemsOf(await request("GET", "/admin/fellowships")) : [];

  for (const record of fellowships) {
    const live = await request("GET", `/fellowships/${record.slug}`).catch(() => null);
    if (!live) {
      log.skip(`${record.slug} - not in the Portal`);
      continue;
    }

    const patch = {};
    const kept = [];
    for (const field of FELLOWSHIP_FIELDS) {
      const next = record[field];
      if (same(live[field], next)) continue;
      if (isPlaceholder(field, live[field], record.slug)) {
        // memberCount: null clears an invented count the old site never gave.
        patch[field] = next === undefined ? null : next;
      } else {
        kept.push(field);
      }
    }

    for (const field of kept) {
      log.keep(`${record.slug}.${field} - edited in the Portal, left alone`);
    }
    const fields = Object.keys(patch);
    if (fields.length === 0) {
      if (kept.length === 0) log.skip(`${record.slug} - already up to date`);
      continue;
    }

    if (!APPLY) {
      log.write(`${record.slug} - would set ${fields.join(", ")}`);
      continue;
    }
    try {
      const target = admin.find((f) => f.slug === record.slug);
      if (!target) throw new Error("no admin record with that slug");
      await request("PATCH", `/admin/fellowships/${target.id}`, patch);
      log.write(`${record.slug} - set ${fields.join(", ")}`);
    } catch (error) {
      log.fail(record.slug, error);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Service timings                                                            */
/* -------------------------------------------------------------------------- */

/** The sample rows the old mock seeded, identified by day + time + service. */
const PLACEHOLDER_TIMINGS = new Set([
  "Sunday|6:00 AM|Holy Communion",
  "Sunday|8:00 AM|Morning Worship",
  "Sunday|9:00 AM|Sunday School",
  "Wednesday|6:30 PM|Prayer Meeting",
  "Friday|6:30 PM|Bible Study",
]);
const timingKey = (t) => `${enOf(t.day)}|${enOf(t.time)}|${enOf(t.service)}`;

async function importTimings(timings) {
  log.section("Service timings");

  const live = itemsOf(await request("GET", "/church/service-timings"));
  const edited = live.filter((t) => !PLACEHOLDER_TIMINGS.has(timingKey(t)));

  for (const row of edited) {
    log.keep(`live row not from the sample: ${timingKey(row)}`);
  }
  if (edited.length > 0 && !REPLACE_TIMINGS) {
    log.skip(
      `${edited.length} live row(s) were typed in by someone - not replacing. ` +
        "Check them, then re-run with --replace-timings",
    );
    return;
  }

  const rows = timings.map(({ id, ...rest }) => {
    void id;
    return rest;
  });
  if (!APPLY) {
    log.write(`would replace ${live.length} live rows with the church's ${rows.length}`);
    return;
  }
  try {
    await request("PUT", "/admin/church/service-timings", { items: rows });
    log.write(`replaced ${live.length} rows with ${rows.length}`);
  } catch (error) {
    log.fail("service timings", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Albums and downloads                                                       */
/* -------------------------------------------------------------------------- */

async function findBySlug(resource, slug) {
  if (!APPLY) {
    // Without a login only published records are visible; drafts from an
    // earlier --apply run will not show here, but will be found on --apply.
    const slugs = await request("GET", `/${resource}/slugs`).catch(() => []);
    return slugs.includes(slug) ? { slug } : null;
  }
  const list = await request("GET", `/admin/${resource}?search=${encodeURIComponent(slug)}&pageSize=100`);
  return itemsOf(list).find((r) => r.slug === slug) ?? null;
}

async function createDraft(resource, slug, body) {
  const created = await request("POST", `/admin/${resource}`, { ...body, slug });
  // The API cleans and de-duplicates slugs; insist on ours while still a draft.
  if (created.slug !== slug) {
    await request("PATCH", `/admin/${resource}/${created.id}`, { slug });
  }
  return created;
}

async function publish(resource, id) {
  if (PUBLISH) await request("PATCH", `/admin/${resource}/${id}/status`, { status: "published" });
}

async function importAlbum(album) {
  const name = `${album.slug} (${album.photos?.length ?? album.videos.length} items)`;
  const existing = await findBySlug("gallery", album.slug);
  if (existing) {
    const count = existing.photos?.length ?? existing.photoCount;
    const expected = album.photos?.length ?? album.videos.length;
    if (count !== undefined && count < expected) {
      log.fail(name, `exists with only ${count} items - an earlier run stopped part-way. ` +
        "Delete that draft in the Portal and run again.");
    } else {
      log.skip(`${name} - exists`);
    }
    return;
  }
  if (!APPLY) {
    log.write(`${name} - would create${PUBLISH ? " and publish" : " as a draft"}`);
    return;
  }

  // Upload first: a failure here leaves media behind, but no half-built album.
  const items = [];
  if (album.photos) {
    let n = 0;
    for (const photo of album.photos) {
      n++;
      const alt = numberedAlt(album.alt, n);
      const media = await uploadFromLegacy(photo.source, alt, `${album.slug}-${n}`);
      items.push({ image: imageAsset(media, alt), ...(photo.caption ? { caption: photo.caption } : {}) });
      if (n % 25 === 0) console.log(`      … ${n}/${album.photos.length} uploaded`);
    }
  } else {
    for (const video of album.videos) {
      const media = await posterFor(video.url);
      items.push({
        image: imageAsset(media, video.caption),
        caption: video.caption,
        video: { url: video.url, provider: "youtube" },
      });
    }
  }

  const created = await createDraft("gallery", album.slug, {
    title: album.title,
    description: album.description,
    date: album.date,
    cover: items[0].image,
    shared: album.shared ?? true,
    ...(album.fellowshipSlug ? { fellowshipSlug: album.fellowshipSlug } : {}),
  });
  for (let i = 0; i < items.length; i += PHOTO_BATCH) {
    await request("POST", `/admin/gallery/${created.id}/photos`, {
      photos: items.slice(i, i + PHOTO_BATCH),
    });
  }
  await publish("gallery", created.id);
  log.write(`${name} - created${PUBLISH ? " and published" : " as a draft"}`);
}

async function importDownload(download) {
  const existing = await findBySlug("downloads", download.slug);
  if (existing) {
    log.skip(`${download.slug} - exists`);
    return;
  }
  if (!APPLY) {
    log.write(`${download.slug} - would create${PUBLISH ? " and publish" : " as a draft"}`);
    return;
  }
  const media = await uploadFromLegacy(download.source, null, download.slug);
  const created = await createDraft("downloads", download.slug, {
    title: download.title,
    description: download.description,
    category: download.category,
    fileUrl: media.url,
    format: media.format ?? "PDF",
    size: media.size,
    publishedAt: download.publishedAt,
  });
  await publish("downloads", created.id);
  log.write(`${download.slug} - created${PUBLISH ? " and published" : " as a draft"}`);
}

async function each(title, records, fn) {
  log.section(`${title} (${records.length})`);
  for (const record of records) {
    try {
      await fn(record);
    } catch (error) {
      log.fail(record.slug, error);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`Portal API : ${API}`);
  console.log(`Source     : ${archive.source} (crawled ${archive.crawledOn})`);
  console.log(
    `Mode       : ${APPLY ? `apply${PUBLISH ? ", publish" : ", drafts"}${REPLACE_TIMINGS ? ", replace timings" : ""}` : "dry run"}`,
  );

  if (APPLY) {
    if (!EMAIL || !PASSWORD) {
      throw new Error("--apply needs PORTAL_ADMIN_EMAIL and PORTAL_ADMIN_PASSWORD");
    }
    const auth = await request("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
    accessToken = auth.accessToken;
    console.log(`Signed in  : ${auth.user?.email ?? EMAIL}`);
  }

  const [{ FELLOWSHIPS }, { SERVICE_TIMINGS }] = await Promise.all([
    import("../src/data/fellowships.mock.ts"),
    import("../src/data/church.mock.ts"),
  ]);

  await importFellowships(FELLOWSHIPS);
  await importTimings(SERVICE_TIMINGS);
  await each("Photo albums", archive.albums, importAlbum);
  await each("Video album", [archive.videoAlbum], importAlbum);
  await each("Downloads", archive.downloads, importDownload);

  console.log(
    `\n\x1b[1mDone.\x1b[0m ${APPLY ? "written" : "would write"} ${tally.written}, ` +
      `kept ${tally.kept}, skipped ${tally.skipped}, failed ${tally.failed}`,
  );
  if (!APPLY) console.log("Nothing was changed. Re-run with --apply to make these changes.");
  if (tally.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\n\x1b[31mImport aborted:\x1b[0m ${error.message}`);
  process.exitCode = 1;
});
