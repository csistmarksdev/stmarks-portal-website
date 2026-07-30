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
