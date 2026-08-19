/**
 * Migrate WebsiteRT's mock content into the Portal, so it can be managed there.
 *
 *   node --import ./scripts/ts-resolve-hook.mjs scripts/migrate-to-portal.mjs
 *   …            --dry-run     show what would be sent, change nothing
 *   …            --force       re-create records whose slug already exists
 *
 * Why it goes through the HTTP API rather than straight into MongoDB: the admin
 * endpoints run the same validation, slug rules and audit logging that a human
 * editor's changes do. A direct DB insert would produce records the Portal
 * never actually agreed to accept, and no audit trail explaining where they
 * came from.
 *
 * Idempotent. Every record is looked up by slug (or, for the church
 * singletons, simply overwritten) before anything is created, so re-running
 * migrates only what is missing.
 *
 * Slugs are preserved deliberately. The API derives a slug from `title.en` on
 * create, which would rename `harvest-festival-2026` to `harvest-festival` and
 * silently break both the public URL and the `eventSlug` cross-references in
 * the blog posts. So each record is created as a draft, PATCHed to its intended
 * slug while the API still permits it, and only then published.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const API = (process.env.PORTAL_API_URL ?? "http://localhost:4000/v1").replace(/\/$/, "");
const EMAIL = process.env.PORTAL_ADMIN_EMAIL ?? "admin@csistmarksmadipakkam.org";
const PASSWORD = process.env.PORTAL_ADMIN_PASSWORD ?? "ChangeMe@123";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

/* -------------------------------------------------------------------------- */
/* HTTP                                                                       */
/* -------------------------------------------------------------------------- */

let accessToken = "";

async function request(method, path, body) {
  const response = await fetch(`${API}${path}`, {
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
    const detail =
      payload?.message ?? payload?.error ?? `${response.status} ${response.statusText}`;
    throw new Error(
      `${method} ${path} → ${response.status}: ${
        Array.isArray(detail) ? detail.join("; ") : detail
      }`,
    );
  }

  return payload;
}

/** Strips the fields the mock carries but the API assigns itself. */
function payloadOf(record) {
  const { id, slug, createdAt, updatedAt, ...rest } = record;
  void id;
  void slug;
  void createdAt;
  void updatedAt;
  return rest;
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The mocks reference images by relative path (`/frames/ezgif-frame-030.jpg`),
 * which are files inside *this* project's `public/`. The Portal rejects those:
 * `ImageAsset.url` is validated with `@IsUrl`, because the Portal's own uploads
 * return absolute URLs.
 *
 * Pointing the Portal at `http://localhost:3000/frames/…` would "work" and be
 * wrong - the Portal's content would depend on a dev server, and the point of
 * migrating is that the Portal owns this content. So each distinct image is
 * uploaded into the Portal's media library once and the records are rewritten
 * to the returned URL.
 */
const uploaded = new Map();

/**
 * The Portal sniffs the upload's MIME type and rejects anything it does not
 * recognise. A `Blob` built from a buffer has no type, so it arrives as
 * `application/octet-stream` and is refused - the type has to be set here.
 */
const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

async function uploadImage(relativeUrl, alt) {
  if (uploaded.has(relativeUrl)) return uploaded.get(relativeUrl);

  const file = path.join(projectRoot, "public", relativeUrl);
  if (!existsSync(file)) return null;

  const type = MIME_BY_EXTENSION[path.extname(file).toLowerCase()];
  if (!type) throw new Error(`no MIME type known for ${relativeUrl}`);

  const form = new FormData();
  form.append("file", new Blob([await readFile(file)], { type }), path.basename(file));
  form.append("altEn", alt?.en ?? "");
  form.append("altTa", alt?.ta ?? "");

  const response = await fetch(`${API}/admin/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`upload ${relativeUrl} → ${response.status} ${await response.text()}`);
  }

  const asset = await response.json();
  uploaded.set(relativeUrl, asset);
  return asset;
}

/**
 * Walks a record and replaces every relative image URL with its uploaded
 * counterpart, preserving the alt text and picking up the real width/height and
 * blurDataURL the Portal computed on upload.
 */
async function withUploadedMedia(value) {
  if (Array.isArray(value)) {
    return Promise.all(value.map(withUploadedMedia));
  }
  if (!value || typeof value !== "object") return value;

  // An ImageAsset: { url, alt, width, height, blurDataURL? }
  if (typeof value.url === "string" && value.url.startsWith("/") && "alt" in value) {
    const asset = await uploadImage(value.url, value.alt);
    if (!asset) return value;
    return {
      ...value,
      url: asset.url,
      width: asset.width ?? value.width,
      height: asset.height ?? value.height,
      ...(asset.blurDataURL ? { blurDataURL: asset.blurDataURL } : {}),
    };
  }

  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = await withUploadedMedia(nested);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Reporting                                                                  */
/* -------------------------------------------------------------------------- */

const tally = { created: 0, skipped: 0, failed: 0, updated: 0 };

const log = {
  section: (name) => console.log(`\n\x1b[1m${name}\x1b[0m`),
  created: (what) => { tally.created++; console.log(`  \x1b[32m+\x1b[0m ${what}`); },
  updated: (what) => { tally.updated++; console.log(`  \x1b[36m~\x1b[0m ${what}`); },
  skipped: (what) => { tally.skipped++; console.log(`  \x1b[90m=\x1b[0m ${what} (exists)`); },
  failed: (what, error) => {
    tally.failed++;
    console.log(`  \x1b[31m!\x1b[0m ${what}\n      ${error.message}`);
  },
};

/* -------------------------------------------------------------------------- */
/* Collection migration                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Creates one record, forces its slug, then publishes it.
 *
 * `status` is deliberately omitted from the create call: the record is born a
 * draft so the slug stays mutable, and is published as a separate step.
 */
async function migrateRecord(resource, record, label, afterCreate) {
  const body = await withUploadedMedia(payloadOf(record));
  const created = await request("POST", `/admin/${resource}`, body);

  if (created.slug !== record.slug) {
    await request("PATCH", `/admin/${resource}/${created.id}`, { slug: record.slug });
  }

  // Anything the create DTO does not accept - album photos, for instance -
  // has to be attached before the record is published.
  if (afterCreate) await afterCreate(created, record);

  await request("PATCH", `/admin/${resource}/${created.id}/status`, {
    status: "published",
  });

  log.created(label);
}

/**
 * Album photos are not part of `POST /admin/gallery`; they have their own
 * endpoint. Because the API validates with `whitelist: true`, a `photos` array
 * sent to create is stripped in silence - the album is created successfully
 * and completely empty. So they are appended explicitly, and existing albums
 * that were created before this was understood get repaired rather than
 * skipped.
 */
async function attachPhotos(album, record) {
  const photos = record.photos ?? [];
  if (photos.length === 0) return 0;

  const prepared = await Promise.all(
    photos.map(async (photo) => {
      const { id, ...rest } = photo;
      void id;
      return withUploadedMedia(rest);
    }),
  );

  await request("POST", `/admin/gallery/${album.id}/photos`, { photos: prepared });
  return prepared.length;
}

/**
 * Fellowships are seeded by the Portal itself, so they always "exist" and were
 * skipped wholesale - which meant their banners, committees and coordinators
 * never arrived. Existing records are topped up field by field rather than
 * replaced, so anything already edited in the Portal is left alone.
 */
const FELLOWSHIP_FILL_FIELDS = [
  "banner",
  "tagline",
  "about",
  "vision",
  "schedule",
  "committee",
  "coordinator",
  "memberCount",
];

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return value === "";
}

/**
 * The Portal seeds fellowships with a shared `placeholder.jpg` banner. It is
 * technically "set", so a plain emptiness check leaves every fellowship sharing
 * one grey image. Treat it as unset so the mock's per-fellowship photograph
 * takes its place - but only the placeholder: a banner somebody actually
 * uploaded through the Portal is real content and is never overwritten.
 */
function isPlaceholderImage(value) {
  const url = value?.url;
  return typeof url === "string" && /\/placeholder\.[a-z0-9]+$/i.test(url);
}

function needsFilling(liveValue, mockValue) {
  if (isEmpty(mockValue)) return false;
  return isEmpty(liveValue) || isPlaceholderImage(liveValue);
}

async function repairFellowship(record) {
  const live = await request("GET", `/fellowships/${record.slug}`).catch(() => null);
  if (!live) return false;

  const missing = FELLOWSHIP_FILL_FIELDS.filter((field) =>
    needsFilling(live[field], record[field]),
  );
  if (missing.length === 0) return false;

  const patch = {};
  for (const field of missing) {
    patch[field] = await withUploadedMedia(record[field]);
  }

  const list = await request("GET", "/admin/fellowships");
  const admin = (Array.isArray(list) ? list : list.items).find(
    (f) => f.slug === record.slug,
  );
  if (!admin) return false;

  await request("PATCH", `/admin/fellowships/${admin.id}`, patch);
  log.updated(`${record.slug} - filled ${missing.join(", ")}`);
  return true;
}

async function repairAlbum(record) {
  const live = await request("GET", `/gallery/${record.slug}`).catch(() => null);
  if (!live) return false;
  if ((live.photos?.length ?? 0) > 0) return false;
  if ((record.photos?.length ?? 0) === 0) return false;

  // The admin record is needed for its id; the public one is keyed by slug.
  const list = await request("GET", `/admin/gallery?search=${encodeURIComponent(record.slug)}`);
  const admin = (Array.isArray(list) ? list : list.items).find(
    (a) => a.slug === record.slug,
  );
  if (!admin) return false;

  const added = await attachPhotos(admin, record);
  if (added > 0) log.updated(`${record.slug} - attached ${added} missing photos`);
  return added > 0;
}

async function migrateCollection({ resource, records, label, slugsPath, afterCreate, repair }) {
  log.section(`${resource} (${records.length})`);

  let existing = new Set();
  if (!FORCE) {
    try {
      const slugs = await request("GET", slugsPath ?? `/${resource}/slugs`);
      existing = new Set(slugs);
    } catch (error) {
      // A missing slugs endpoint is not fatal - it only costs idempotency.
      console.log(`  \x1b[90m?\x1b[0m could not read existing slugs: ${error.message}`);
    }
  }

  for (const record of records) {
    const name = label(record);

    if (existing.has(record.slug)) {
      // "Exists" is not the same as "complete" - give the resource a chance to
      // fill in anything a previous run created only partially.
      if (!DRY_RUN && repair) {
        try {
          if (await repair(record)) continue;
        } catch (error) {
          log.failed(`${name} (repair)`, error);
          continue;
        }
      }
      log.skipped(name);
      continue;
    }

    if (DRY_RUN) {
      log.created(`${name} [dry run]`);
      continue;
    }

    try {
      await migrateRecord(resource, record, name, afterCreate);
    } catch (error) {
      log.failed(name, error);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`Portal API : ${API}`);
  console.log(`Mode       : ${DRY_RUN ? "dry run" : FORCE ? "force re-create" : "idempotent"}`);

  if (!DRY_RUN) {
    const auth = await request("POST", "/auth/login", {
      email: EMAIL,
      password: PASSWORD,
    });
    accessToken = auth.accessToken;
    console.log(`Signed in  : ${auth.user?.email ?? EMAIL}`);
  }

  const [events, blog, gallery, announcements, downloads, fellowships, church] =
    await Promise.all([
      import("../src/data/events.mock.ts"),
      import("../src/data/blog.mock.ts"),
      import("../src/data/gallery.mock.ts"),
      import("../src/data/announcements.mock.ts"),
      import("../src/data/downloads.mock.ts"),
      import("../src/data/fellowships.mock.ts"),
      import("../src/data/church.mock.ts"),
    ]);

  /* ---- church singletons: PUT, so they are simply overwritten ---------- */
  log.section("church singletons (3)");
  const singletons = [
    ["service-timings", church.SERVICE_TIMINGS.map(({ id, ...rest }) => { void id; return rest; })],
    ["pastor-message", church.PASTOR_MESSAGE],
    ["weekly-verse", church.WEEKLY_VERSE],
  ];
  for (const [key, value] of singletons) {
    if (DRY_RUN) { log.updated(`${key} [dry run]`); continue; }
    try {
      // The singleton endpoints take the document itself; timings are an array,
      // which needs wrapping because a JSON body must be an object.
      await request("PUT", `/admin/church/${key}`, Array.isArray(value) ? { items: value } : value);
      log.updated(key);
    } catch (error) {
      log.failed(key, error);
    }
  }

  /* ---- fellowships first: everything else references their slugs ------- */
  await migrateCollection({
    resource: "fellowships",
    records: fellowships.FELLOWSHIPS,
    label: (f) => `${f.slug} - ${f.name.en}`,
    repair: repairFellowship,
  });

  await migrateCollection({
    resource: "events",
    records: events.EVENTS,
    label: (e) => `${e.slug} - ${e.title.en}`,
  });

  await migrateCollection({
    resource: "gallery",
    records: gallery.GALLERY_ALBUMS,
    label: (a) => `${a.slug} - ${a.title.en} (${a.photos?.length ?? 0} photos)`,
    afterCreate: attachPhotos,
    repair: repairAlbum,
  });

  await migrateCollection({
    resource: "blog",
    records: blog.BLOG_POSTS,
    label: (p) => `${p.slug} - ${p.title.en}`,
  });

  /*
   * Downloads are deliberately not migrated.
   *
   * Every `fileUrl` in the mock points at a PDF that does not exist - there is
   * no `public/downloads/` directory, so those links already 404 on this site
   * today. Migrating them would move eight broken links into the Portal and
   * publish them as though they were real documents. The bulletins and forms
   * have to be uploaded through the Portal's Downloads screen, where the actual
   * files can be attached.
   */
  log.section(`downloads (${downloads.DOWNLOADS.length})`);
  console.log(
    "  \x1b[33m·\x1b[0m skipped - the mock's PDFs do not exist on disk.\n" +
      "    Upload the real files in the Portal → Downloads. Titles for reference:",
  );
  for (const record of downloads.DOWNLOADS) {
    console.log(`      ${record.category.padEnd(9)} ${record.title.en}`);
  }

  /* ---- announcements have no slug: match on title ---------------------- */
  for (const [resource, records, titleOf] of [
    ["announcements", announcements.ANNOUNCEMENTS, (r) => r.title.en],
  ]) {
    log.section(`${resource} (${records.length})`);

    let seen = new Set();
    if (!FORCE) {
      try {
        const list = await request("GET", `/${resource}`);
        seen = new Set((Array.isArray(list) ? list : list.items).map((r) => r.title?.en));
      } catch (error) {
        console.log(`  \x1b[90m?\x1b[0m could not read existing: ${error.message}`);
      }
    }

    for (const record of records) {
      const name = titleOf(record);
      if (seen.has(name)) { log.skipped(name); continue; }
      if (DRY_RUN) { log.created(`${name} [dry run]`); continue; }
      try {
        const created = await request("POST", `/admin/${resource}`, payloadOf(record));
        await request("PATCH", `/admin/${resource}/${created.id}/status`, {
          status: "published",
        });
        log.created(name);
      } catch (error) {
        log.failed(name, error);
      }
    }
  }

  console.log(
    `\n\x1b[1mDone.\x1b[0m created ${tally.created}, updated ${tally.updated}, ` +
      `skipped ${tally.skipped}, failed ${tally.failed}`,
  );
  if (tally.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\n\x1b[31mMigration aborted:\x1b[0m ${error.message}`);
  process.exitCode = 1;
});
