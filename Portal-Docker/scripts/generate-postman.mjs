/**
 * Generates the Postman collection + environment for the Portal API.
 *
 *   node scripts/generate-postman.mjs
 *
 * Output: docs/postman/*.postman_{collection,environment}.json
 * Regenerate whenever endpoints change so the collection stays honest.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "postman");
mkdirSync(outDir, { recursive: true });

/* ------------------------------ helpers ---------------------------------- */

const url = (path, query = []) => {
  const segments = path.split("/").filter(Boolean);
  return {
    raw:
      `{{baseUrl}}/${segments.join("/")}` +
      (query.length ? `?${query.map((q) => `${q.key}=${q.value}`).join("&")}` : ""),
    host: ["{{baseUrl}}"],
    path: segments,
    ...(query.length
      ? { query: query.map((q) => ({ ...q, disabled: q.disabled ?? true })) }
      : {}),
  };
};

const jsonBody = (obj) => ({
  mode: "raw",
  raw: JSON.stringify(obj, null, 2),
  options: { raw: { language: "json" } },
});

const test = (lines) => [
  { listen: "test", script: { type: "text/javascript", exec: lines } },
];

const req = (name, method, path, { query, body, events, description, noAuth, formdata } = {}) => ({
  name,
  ...(events ? { event: events } : {}),
  request: {
    ...(noAuth ? { auth: { type: "noauth" } } : {}),
    method,
    header: [],
    ...(body ? { body: jsonBody(body) } : {}),
    ...(formdata ? { body: { mode: "formdata", formdata } } : {}),
    url: url(path, query),
    ...(description ? { description } : {}),
  },
});

const folder = (name, items, description) => ({
  name,
  ...(description ? { description } : {}),
  item: items,
});

/* ----------------------------- shared bodies ------------------------------ */

const t = (en, ta) => ({ en, ta });

const saveCreatedId = (varName) =>
  test([
    "const body = pm.response.json();",
    `pm.environment.set("${varName}", body.id);`,
    'pm.test("created", () => pm.response.code === 201 || pm.response.code === 200);',
  ]);

const sampleImage = {
  url: "{{baseUrl2}}/uploads/images/placeholder.jpg",
  alt: t("Sample image", "மாதிரி படம்"),
  width: 1600,
  height: 900,
};

/* -------------------------------- Auth ------------------------------------ */

const authFolder = folder("Auth", [
  req("Login", "POST", "/auth/login", {
    noAuth: true,
    body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
    events: test([
      "const body = pm.response.json();",
      'pm.environment.set("accessToken", body.accessToken);',
      'pm.environment.set("refreshToken", body.refreshToken);',
      'pm.test("logged in", () => pm.expect(body.user.email).to.exist);',
    ]),
    description:
      "Signs in and stores accessToken/refreshToken in the environment. Run this first — every /admin request uses {{accessToken}}.",
  }),
  req("Refresh tokens", "POST", "/auth/refresh", {
    noAuth: true,
    body: { refreshToken: "{{refreshToken}}" },
    events: test([
      "const body = pm.response.json();",
      'pm.environment.set("accessToken", body.accessToken);',
      'pm.environment.set("refreshToken", body.refreshToken);',
    ]),
    description: "Rotates the pair. The previous refresh token stops working.",
  }),
  req("Me", "GET", "/auth/me"),
  req("Logout", "POST", "/auth/logout", {
    description: "Revokes the stored refresh token.",
  }),
]);

/* ---------------------------- Public contract ----------------------------- */

const publicFolder = folder(
  "Public (Website contract)",
  [
    folder("Events", [
      req("List events", "GET", "/events", {
        noAuth: true,
        query: [
          { key: "status", value: "upcoming" },
          { key: "fellowship", value: "youth-fellowship" },
          { key: "featured", value: "true" },
          { key: "limit", value: "6" },
          { key: "page", value: "1" },
          { key: "pageSize", value: "12" },
        ],
        description:
          "Plain array by default; sending page/pageSize switches to the Paginated<T> envelope.",
      }),
      req("Event slugs", "GET", "/events/slugs", { noAuth: true }),
      req("Event by slug", "GET", "/events/{{eventSlug}}", { noAuth: true }),
    ]),
    folder("Blog", [
      req("List posts", "GET", "/blog", {
        noAuth: true,
        query: [
          { key: "event", value: "{{eventSlug}}" },
          { key: "fellowship", value: "choir" },
          { key: "limit", value: "6" },
        ],
      }),
      req("Post slugs", "GET", "/blog/slugs", { noAuth: true }),
      req("Post by slug", "GET", "/blog/{{blogSlug}}", { noAuth: true }),
    ]),
    folder("Gallery", [
      req("List albums", "GET", "/gallery", {
        noAuth: true,
        query: [
          { key: "fellowship", value: "sunday-school" },
          { key: "limit", value: "6" },
        ],
      }),
      req("Album slugs", "GET", "/gallery/slugs", { noAuth: true }),
      req("Album by slug", "GET", "/gallery/{{albumSlug}}", { noAuth: true }),
    ]),
    folder("Announcements", [
      req("List announcements", "GET", "/announcements", {
        noAuth: true,
        query: [
          { key: "fellowship", value: "womens-fellowship" },
          { key: "limit", value: "5" },
        ],
        description: "Pinned first, then newest.",
      }),
      req("Pinned announcement", "GET", "/announcements/pinned", {
        noAuth: true,
        description: "Returns the pinned announcement or JSON null.",
      }),
    ]),
    folder("Downloads", [
      req("List downloads", "GET", "/downloads", {
        noAuth: true,
        query: [
          { key: "category", value: "bulletin" },
          { key: "fellowship", value: "mens-fellowship" },
        ],
      }),
      req("Grouped by category", "GET", "/downloads/grouped", { noAuth: true }),
    ]),
    folder("Fellowships", [
      req("List fellowships", "GET", "/fellowships", { noAuth: true }),
      req("Fellowship slugs", "GET", "/fellowships/slugs", { noAuth: true }),
      req("Fellowship by slug", "GET", "/fellowships/youth-fellowship", {
        noAuth: true,
      }),
    ]),
    folder(
      "Church singletons",
      [
        req("Service timings", "GET", "/church/service-timings", { noAuth: true }),
        req("Pastor message", "GET", "/church/pastor-message", { noAuth: true }),
        req("Weekly verse", "GET", "/church/weekly-verse", { noAuth: true }),
      ],
      "Only the church content that changes. The profile, history, vision & mission, diocese and hero slides are hardcoded in the Website and have no endpoint here.",
    ),
    folder("Contact", [
      req("Submit contact form", "POST", "/contact", {
        noAuth: true,
        body: {
          name: "Postman Tester",
          email: "tester@example.org",
          phone: "+91 90000 00000",
          subject: "Trying the contact form",
          message: "Hello from the Postman collection — please ignore.",
        },
        description: "Rate limited to 3/min per IP. Returns { success, messageKey }.",
      }),
    ]),
  ],
  "The exact endpoints the public Website consumes. No authentication.",
);

/* ------------------------------ Admin CRUD -------------------------------- */

const statusBody = { status: "published" };
const listQuery = [
  { key: "page", value: "1" },
  { key: "pageSize", value: "20" },
  { key: "search", value: "" },
  { key: "status", value: "draft" },
];

const crudFolder = (name, base, idVar, createBody, patchBody, extras = []) =>
  folder(name, [
    req(`List`, "GET", base, { query: listQuery }),
    req(`Create`, "POST", base, {
      body: createBody,
      events: saveCreatedId(idVar),
      description: `Saves the new id into {{${idVar}}}.`,
    }),
    req(`Get by id`, "GET", `${base}/{{${idVar}}}`),
    req(`Update`, "PATCH", `${base}/{{${idVar}}}`, { body: patchBody }),
    req(`Set status (publish/draft/archive)`, "PATCH", `${base}/{{${idVar}}}/status`, {
      body: statusBody,
    }),
    ...extras,
    req(`Delete`, "DELETE", `${base}/{{${idVar}}}`),
  ]);

const adminEvents = crudFolder(
  "Events",
  "/admin/events",
  "eventId",
  {
    title: t("Postman Test Event", "போஸ்ட்மேன் சோதனை நிகழ்வு"),
    summary: t("Created from the Postman collection.", "போஸ்ட்மேன் தொகுப்பிலிருந்து உருவாக்கப்பட்டது."),
    description: [t("First paragraph.", "முதல் பத்தி.")],
    startDate: "2026-12-24T18:00:00.000Z",
    endDate: "2026-12-24T21:00:00.000Z",
    location: t("Main Sanctuary", "பிரதான ஆலயம்"),
    fellowshipSlug: "choir",
    featured: false,
    status: "draft",
  },
  { summary: t("Updated from Postman.", "போஸ்ட்மேனில் புதுப்பிக்கப்பட்டது."), featured: true },
);

const adminBlog = crudFolder(
  "Blog",
  "/admin/blog",
  "blogId",
  {
    title: t("Postman Test Post", "போஸ்ட்மேன் சோதனை பதிவு"),
    excerpt: t("A short excerpt.", "சுருக்கமான பகுதி."),
    body: [t("Body paragraph one.", "உடல் பத்தி ஒன்று.")],
    publishedAt: "2026-07-20",
    author: t("Church Office", "ஆலய அலுவலகம்"),
    status: "draft",
  },
  { excerpt: t("Updated excerpt.", "புதுப்பிக்கப்பட்ட பகுதி.") },
);

const adminGallery = crudFolder(
  "Gallery",
  "/admin/gallery",
  "albumId",
  {
    title: t("Postman Test Album", "போஸ்ட்மேன் சோதனை ஆல்பம்"),
    description: t("Album created from Postman.", "போஸ்ட்மேனில் உருவாக்கப்பட்ட ஆல்பம்."),
    date: "2026-06-14",
    cover: sampleImage,
    shared: false,
    status: "draft",
  },
  { description: t("Updated description.", "புதுப்பிக்கப்பட்ட விளக்கம்.") },
  [
    req("Add photos", "POST", "/admin/gallery/{{albumId}}/photos", {
      body: {
        photos: [
          { image: sampleImage, caption: { en: "A caption" } },
          {
            image: sampleImage,
            video: { url: "https://youtu.be/dQw4w9WgXcQ" },
          },
        ],
      },
      events: test([
        "const body = pm.response.json();",
        "const last = body.photos[body.photos.length - 1];",
        'if (last) pm.environment.set("photoId", last.id);',
      ]),
      description:
        "Appends a batch of items in one request — the admin picker sends every ticked photo at once. Set 'video' to make an item a video: 'image' becomes its poster frame and 'provider' is inferred from the URL (youtube / vimeo / file). Hosted links must contain an extractable video id or the whole batch is rejected with 400, since an unparseable link renders a dead player on the site. Saves the last id into {{photoId}}.",
    }),
    req("Reorder photos", "PATCH", "/admin/gallery/{{albumId}}/photos/reorder", {
      body: { photoIds: ["{{photoId}}"] },
      description: "photoIds must be a permutation of the album's current photo ids.",
    }),
    req("Remove photo", "DELETE", "/admin/gallery/{{albumId}}/photos/{{photoId}}"),
  ],
);

const adminAnnouncements = crudFolder(
  "Announcements",
  "/admin/announcements",
  "announcementId",
  {
    title: t("Postman Test Notice", "போஸ்ட்மேன் சோதனை அறிவிப்பு"),
    body: t("Notice body.", "அறிவிப்பு உள்ளடக்கம்."),
    publishedAt: "2026-07-20",
    pinned: false,
    status: "draft",
  },
  { body: t("Updated notice body.", "புதுப்பிக்கப்பட்ட அறிவிப்பு.") },
  [
    req("Pin / unpin", "PATCH", "/admin/announcements/{{announcementId}}/pin", {
      body: { pinned: true },
      description: "Pinning one announcement unpins every other.",
    }),
  ],
);

const adminDownloads = crudFolder(
  "Downloads",
  "/admin/downloads",
  "downloadId",
  {
    title: t("Postman Test Bulletin", "போஸ்ட்மேன் சோதனை செய்திமடல்"),
    category: "bulletin",
    fileUrl: "{{baseUrl2}}/uploads/files/sample.pdf",
    format: "PDF",
    size: "120 KB",
    publishedAt: "2026-07-20",
    status: "draft",
  },
  { category: "document" },
);

const adminFellowships = folder("Fellowships", [
  req("List", "GET", "/admin/fellowships"),
  req("Create", "POST", "/admin/fellowships", {
    body: {
      slug: "other-fellowships",
      name: t("Other Fellowships", "பிற ஐக்கியங்கள்"),
      tagline: t("Every member has a place", "ஒவ்வொருவருக்கும் இடம் உண்டு"),
      about: [t("About paragraph.", "பற்றி பத்தி.")],
      vision: t("Vision text.", "நோக்கு உரை."),
      schedule: t("Every Sunday, 4:00 PM", "ஒவ்வொரு ஞாயிறு, மாலை 4:00"),
      banner: sampleImage,
      committee: [],
      coordinator: { name: t("Church Office", "ஆலய அலுவலகம்") },
      order: 8,
    },
    events: saveCreatedId("fellowshipId"),
    description:
      "Slug must be one of the fixed eight; fails with 409 if it already exists (the seed creates all eight).",
  }),
  req("Get by id", "GET", "/admin/fellowships/{{fellowshipId}}"),
  req("Update", "PATCH", "/admin/fellowships/{{fellowshipId}}", {
    body: { memberCount: 42 },
  }),
  req("Set status", "PATCH", "/admin/fellowships/{{fellowshipId}}/status", {
    body: statusBody,
  }),
  req("Delete", "DELETE", "/admin/fellowships/{{fellowshipId}}"),
]);

const churchPut = (key, body, label) =>
  folder(label ?? key, [
    req("Get", "GET", `/admin/church/${key}`),
    req("Update", "PUT", `/admin/church/${key}`, { body }),
  ]);

const adminChurch = folder(
  "Church singletons",
  [
    churchPut(
      "service-timings",
      {
        items: [
          {
            day: t("Sunday", "ஞாயிறு"),
            time: t("6:30 AM", "காலை 6:30"),
            service: t("Holy Communion", "திருவிருந்து ஆராதனை"),
            venue: t("Main Sanctuary", "பிரதான ஆலயம்"),
          },
        ],
      },
      "Service timings",
    ),
    churchPut(
      "pastor-message",
      {
        authorName: t("Rev. Presbyter", "போதகர்"),
        authorRole: t("Presbyter-in-charge", "பொறுப்பு போதகர்"),
        excerpt: t("Grace and peace.", "கிருபையும் சமாதானமும்."),
        body: [t("Message body.", "செய்தி.")],
      },
      "Pastor message",
    ),
    churchPut(
      "weekly-verse",
      {
        reference: t("John 3:16", "யோவான் 3:16"),
        text: t("For God so loved the world…", "தேவன் உலகத்தை அன்பு கூர்ந்தார்…"),
        weekOf: "2026-07-20",
      },
      "Weekly verse",
    ),
  ],
  "GET returns the stored payload; PUT replaces it (upsert). The profile, history, vision & mission, diocese and hero slides are hardcoded in the Website and have no editor here.",
);

const adminMedia = folder("Media library", [
  req("Upload file", "POST", "/admin/media", {
    formdata: [
      { key: "file", type: "file", src: "" },
      { key: "altEn", value: "English alt text", type: "text", disabled: true },
      { key: "altTa", value: "தமிழ் மாற்று உரை", type: "text", disabled: true },
    ],
    events: test([
      "const body = pm.response.json();",
      'pm.environment.set("mediaId", body.id);',
    ]),
    description:
      "Pick a file in the Body tab. Images come back with width/height, a thumbnail and blurDataURL; the id is saved to {{mediaId}}.",
  }),
  req("Video poster from a link", "POST", "/admin/media/video-poster", {
    body: { url: "https://youtu.be/jNQXAC9IVRw" },
    events: test([
      "const body = pm.response.json();",
      'pm.environment.set("mediaId", body.id);',
    ]),
    description:
      "Downloads a YouTube/Vimeo thumbnail into the media library and returns it as an ImageAsset-ready item, so adding a video only needs its link. 422 when no thumbnail can be had (bad link, video file, or no outbound network) — the CMS then asks for a poster upload.",
  }),
  req("List", "GET", "/admin/media", {
    query: [
      { key: "kind", value: "image" },
      { key: "search", value: "" },
      { key: "page", value: "1" },
      { key: "pageSize", value: "24" },
    ],
  }),
  req("Get by id", "GET", "/admin/media/{{mediaId}}"),
  req("Update alt text", "PATCH", "/admin/media/{{mediaId}}", {
    body: { alt: t("New alt", "புதிய மாற்று உரை") },
  }),
  req("Delete", "DELETE", "/admin/media/{{mediaId}}"),
]);

const adminUsers = folder("Users", [
  req("List", "GET", "/admin/users", {
    query: [
      { key: "page", value: "1" },
      { key: "pageSize", value: "20" },
      { key: "search", value: "" },
    ],
  }),
  req("Create", "POST", "/admin/users", {
    body: {
      name: "Postman Editor",
      email: "postman-editor@example.org",
      password: "Password@123",
      role: "editor",
      active: true,
    },
    events: saveCreatedId("userId"),
  }),
  req("Get by id", "GET", "/admin/users/{{userId}}"),
  req("Update", "PATCH", "/admin/users/{{userId}}", { body: { role: "viewer" } }),
  req("Reset password", "PATCH", "/admin/users/{{userId}}/password", {
    body: { password: "NewPassword@123" },
  }),
  req("Delete", "DELETE", "/admin/users/{{userId}}"),
]);

const adminMisc = folder("Audit, inbox & dashboard", [
  req("Audit logs", "GET", "/admin/audit-logs", {
    query: [
      { key: "page", value: "1" },
      { key: "pageSize", value: "25" },
      { key: "action", value: "publish" },
      { key: "resource", value: "events" },
      { key: "userId", value: "" },
    ],
  }),
  req("Contact messages", "GET", "/admin/contact-messages", {
    query: [
      { key: "page", value: "1" },
      { key: "pageSize", value: "20" },
      { key: "unread", value: "true" },
    ],
    events: test([
      "const body = pm.response.json();",
      'if (body.items && body.items[0]) pm.environment.set("contactMessageId", body.items[0].id);',
    ]),
  }),
  req("Mark message read", "PATCH", "/admin/contact-messages/{{contactMessageId}}/read", {
    body: { read: true },
  }),
  req("Delete message", "DELETE", "/admin/contact-messages/{{contactMessageId}}"),
  req("Dashboard stats", "GET", "/admin/dashboard/stats"),
]);

/* ------------------------------ collection -------------------------------- */

const collection = {
  info: {
    name: "CSISTMC Portal API",
    description:
      "CSI St. Mark's Church — Portal API.\n\n" +
      "1. Import `CSISTMC-Portal-Local.postman_environment.json` and select it.\n" +
      "2. Run **Auth → Login** — tokens are stored automatically.\n" +
      "3. Everything under the Admin folders sends `Authorization: Bearer {{accessToken}}`; the Public folder sends nothing.\n\n" +
      "Create requests store the new record's id (e.g. {{eventId}}) so the Get/Update/Delete requests in the same folder work in order. Swagger lives at {{baseUrl2}}/docs.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  auth: {
    type: "bearer",
    bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
  },
  item: [
    authFolder,
    publicFolder,
    folder(
      "Admin",
      [
        adminEvents,
        adminBlog,
        adminGallery,
        adminAnnouncements,
        adminDownloads,
        adminFellowships,
        adminChurch,
        adminMedia,
        adminUsers,
        adminMisc,
      ],
      "Authenticated CMS endpoints — run Auth → Login first.",
    ),
  ],
};

/* ------------------------------ environment ------------------------------- */

const environment = {
  name: "CSISTMC Portal — Local",
  values: [
    { key: "baseUrl", value: "http://localhost:4000/v1", enabled: true },
    { key: "baseUrl2", value: "http://localhost:4000", enabled: true, description: "Origin without the API prefix (uploads, Swagger)." },
    { key: "adminEmail", value: "admin@csistmarksmadipakkam.org", enabled: true },
    { key: "adminPassword", value: "ChangeMe@123", enabled: true },
    { key: "accessToken", value: "", enabled: true },
    { key: "refreshToken", value: "", enabled: true },
    { key: "eventSlug", value: "sample-harvest-festival", enabled: true },
    { key: "blogSlug", value: "", enabled: true },
    { key: "albumSlug", value: "", enabled: true },
    { key: "eventId", value: "", enabled: true },
    { key: "blogId", value: "", enabled: true },
    { key: "albumId", value: "", enabled: true },
    { key: "photoId", value: "", enabled: true },
    { key: "announcementId", value: "", enabled: true },
    { key: "downloadId", value: "", enabled: true },
    { key: "fellowshipId", value: "", enabled: true },
    { key: "leaderId", value: "", enabled: true },
    { key: "mediaId", value: "", enabled: true },
    { key: "userId", value: "", enabled: true },
    { key: "contactMessageId", value: "", enabled: true },
  ],
  _postman_variable_scope: "environment",
};

/* --------------------------------- write ---------------------------------- */

const collectionPath = join(outDir, "CSISTMC-Portal.postman_collection.json");
const environmentPath = join(outDir, "CSISTMC-Portal-Local.postman_environment.json");

writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
writeFileSync(environmentPath, JSON.stringify(environment, null, 2));

// Sanity: both files must round-trip as JSON.
JSON.parse(JSON.stringify(collection));
JSON.parse(JSON.stringify(environment));

const count = (items) =>
  items.reduce((n, item) => n + (item.item ? count(item.item) : 1), 0);

console.log(`✓ ${collectionPath} (${count(collection.item)} requests)`);
console.log(`✓ ${environmentPath} (${environment.values.length} variables)`);
