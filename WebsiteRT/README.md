# CSI St. Mark's Church, Madipakkam — Website

Bilingual (English / Tamil) church website built with **Next.js 16** (App Router), React 19, Tailwind CSS 4, `next-intl`, Framer Motion and GSAP.

Content on the site splits two ways. Everything that changes — events, blog posts, gallery albums, announcements, downloads, fellowships, service timings, the pastor's message, the weekly verse — is **CMS-managed**: it currently comes from **mock data** in `src/data/*.mock.ts` and reaches the UI through a typed **service layer** in `src/services/`, designed so the backend (**NestJS**, in `Portal/`) drops in by changing only the service function bodies. Write-once material — the church profile, history, vision & mission, diocese details, the leadership roll and hero imagery — is **hardcoded** in `src/content/` and ships with the build; it has no API endpoint by design (see §5.8). This README documents the frontend architecture and the **exact API contract the backend must implement**.

---

## 1. Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve production build
npm run lint

npm run dev:fresh  # dev, after clearing the build cache
npm run clean      # delete .next / .turbo
npm run reap       # kill orphaned dev workers (runs automatically before dev)
```

### If node is eating all your RAM

Turbopack evaluates Node-side modules in child processes
(`node .next/dev/build/<hash>.js <port>`). They are **not** reaped when the dev
server dies — on Windows, closing the terminal or a dev-server crash leaves them
running, and they accumulate across restarts. This project has seen 1080 of them
holding 8.6 GB with no dev server running at all.

`npm run dev` now runs `reap` first, which kills workers belonging to this
project whose parent process is gone. Workers of a *running* dev server are
never touched, so it is safe to run at any time.

To check by hand:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Measure-Object WorkingSetSize -Sum |
  ForEach-Object { "{0} procs, {1:N2} GB" -f $_.Count, ($_.Sum/1GB) }
```

A `.next` that has grown to gigabytes is the other symptom — a corrupt dev cache
makes a fresh start crash-loop, which is what produces the storm. `npm run
dev:fresh` clears it.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (SEO, sitemap, OG tags) | `https://csistmarksmadipakkam.org` |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API. **Empty until the backend exists** — services fall back to mock data. | `""` |

> ⚠️ This repo pins a newer Next.js than most docs online. Per `AGENTS.md`, consult `node_modules/next/dist/docs/` before writing Next-specific code (e.g. middleware is renamed to `src/proxy.ts` here).

---

## 2. Project structure

```
src/
├── app/[locale]/          # Routed pages (en served at /, ta at /ta)
│   ├── page.tsx           # Home
│   ├── about/             # History, vision/mission, diocese, service timings
│   ├── leadership/        # Pastors, assistant pastors, committee, former pastors
│   ├── fellowships/       # List + [slug] detail
│   ├── events/            # List + [slug] detail
│   │   └── blog/          # Blog list + [slug] detail (event reports/testimonies)
│   ├── gallery/           # Albums + [slug] full-screen photo/video viewer
│   ├── announcements/
│   ├── downloads/         # Bulletins, forms, documents
│   └── contact/           # Contact info + contact form
├── services/              # ⭐ ALL content flows through here — see §4
├── content/               # Permanent site content (church identity, leadership, hero imagery)
├── data/                  # Mock data (*.mock.ts) — deleted once backend is live
├── types/
│   ├── common.ts          # LocalizedText, BaseEntity, ImageAsset, Paginated
│   └── content.ts         # Every content model (the API contract shapes)
├── components/            # cards / common / motion / ui primitives
├── features/              # Page-level sections (home, gallery, contact, cinematic hero)
├── i18n/                  # next-intl routing: locales ["en", "ta"]
├── messages/              # UI chrome strings (en.json, ta.json) — NOT content
├── constants/             # site.ts (ROUTES, API_BASE_URL), navigation.ts
└── lib/                   # localize(), date helpers, utils

public/
├── frames/                # 300-frame cinematic hero sequence (home page scroll animation)
└── hero/<section>/        # 6 backdrop slides per inner page (placeholders)
```

### Two kinds of text — do not confuse them

| Kind | Where it lives | Example |
|---|---|---|
| **UI chrome** | `src/messages/{en,ta}.json`, read via `useTranslations()` | Button labels, headings, form errors |
| **Content** | Service layer → (future) API, typed as `LocalizedText` | Event titles, leader bios, album names |

Content fields are localized **per record**: `LocalizedText = { en: string; ta: string }`. The backend must store and return both languages on every translatable field. The frontend resolves them with `localize(field, locale)`.

---

## 3. Core shared types (what every API response uses)

From [src/types/common.ts](src/types/common.ts):

```ts
type LocalizedText = { en: string; ta: string };

interface BaseEntity {
  id: string;
  slug: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

interface ImageAsset {
  url: string;               // absolute URL served by backend/CDN
  alt: LocalizedText;
  width: number;
  height: number;
  blurDataURL?: string;      // tiny base64 preview (recommended)
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

All content models live in [src/types/content.ts](src/types/content.ts) — treat that file as the **single source of truth for response schemas**. The backend DTOs must match it field-for-field (or the file gets updated in the same PR that changes the API).

---

## 4. Service layer — the wiring point

Every page/component calls functions from `src/services/` (never `src/data/` directly). Each function is already `async`. To connect the backend, change **only the body** of each function from `mockResponse(...)` to `apiGet<T>(...)`:

```ts
// Before (mock)
export function getEvents(): Promise<ChurchEvent[]> {
  return mockResponse([...EVENTS].sort(descending));
}

// After (live)
export function getEvents(): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", { tags: ["events"] });
}
```

[src/services/http.ts](src/services/http.ts) provides:

- `apiGet<T>(endpoint, { params, revalidate, tags, signal })` — typed fetch against `NEXT_PUBLIC_API_URL`, with Next.js ISR caching (default `revalidate: 300`s) and **cache tags** for on-demand revalidation.
- `ApiError` — thrown on non-2xx with `status` and `endpoint`.

**Recommended cache tags per resource:** `events`, `blog`, `gallery`, `announcements`, `downloads`, `fellowships`, `church`. When the CMS publishes a change, the backend should call a frontend revalidation webhook (a small `POST /api/revalidate?tag=events` route handler — to be added) so edits appear without waiting for the ISR window.

---

## 5. Backend API contract

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `https://api.csistmarksmadipakkam.org/v1`).
All responses `application/json`. Localized fields always contain **both** `en` and `ta`. Dates are ISO 8601 strings. Lists that can grow unbounded should support `?page=&pageSize=&search=` and return `Paginated<T>` (the frontend's `Paginated` type exists for exactly this); small fixed lists may return plain arrays as noted.

### 5.1 Events — `ChurchEvent`

| Method | Endpoint | Query params | Returns | Frontend caller |
|---|---|---|---|---|
| GET | `/events` | `status=upcoming\|past`, `fellowship=<slug>`, `featured=true`, `limit`, `page`, `pageSize` | `ChurchEvent[]` (newest first; upcoming sorted ascending) | `getEvents`, `getUpcomingEvents`, `getPastEvents`, `getEventsByFellowship` |
| GET | `/events/slugs` | — | `string[]` | `getEventSlugs` (for `generateStaticParams`) |
| GET | `/events/:slug` | — | `ChurchEvent` (404 if missing) | `getEventBySlug` |

`ChurchEvent`: `BaseEntity` + `title`, `summary`, `description: LocalizedText[]` (ordered paragraphs), `startDate`, `endDate?`, `location`, `image?: ImageAsset`, `fellowshipSlug?`, `organiser?`, `featured: boolean`. Status (`upcoming`/`ongoing`/`past`) is **derived from dates** — do not store it.

### 5.2 Blog — `BlogPost`

| Method | Endpoint | Query params | Returns | Frontend caller |
|---|---|---|---|---|
| GET | `/blog` | `event=<eventSlug>`, `fellowship=<slug>`, `limit`, `page`, `pageSize` | `BlogPost[]` newest first | `getBlogPosts`, `getBlogPostsByEvent`, `getBlogPostsByFellowship` |
| GET | `/blog/slugs` | — | `string[]` | `getBlogSlugs` |
| GET | `/blog/:slug` | — | `BlogPost` | `getBlogPostBySlug` |

`BlogPost`: `BaseEntity` + `title`, `excerpt`, `body: LocalizedText[]` (ordered paragraphs — maps onto a rich-text field), `publishedAt`, `author`, `coverImage?`, `eventSlug?` (links a post to the event it reports on), `fellowshipSlug?`, `readingMinutes?` (computed server-side).

### 5.3 Gallery — `GalleryAlbum`

| Method | Endpoint | Query params | Returns | Frontend caller |
|---|---|---|---|---|
| GET | `/gallery` | `fellowship=<slug>`, `limit`, `page`, `pageSize` | `GalleryAlbum[]` newest first by `date` | `getGallery`, `getAlbumsByFellowship` |
| GET | `/gallery/slugs` | — | `string[]` | `getAlbumSlugs` |
| GET | `/gallery/:slug` | — | `GalleryAlbum` incl. full `photos[]` | `getAlbumBySlug` |

`GalleryAlbum`: `BaseEntity` + `title`, `description?`, `date`, `cover: ImageAsset`, `photos: GalleryPhoto[]`, `fellowshipSlug?`, `shared?: boolean`. List endpoint may omit `photos` (only the detail page needs them) — if so, type the list response accordingly.

- **`fellowshipSlug`** ties an album to one fellowship's events. **`shared: true`** marks a churchwide album (e.g. Christmas, harvest) that appears in **every** fellowship's gallery — `getAlbumsByFellowship(slug)` returns albums where `fellowshipSlug === slug` **or** `shared`. A shared album needs no `fellowshipSlug`.
- **`GalleryPhoto`** = `{ id, image: ImageAsset, caption?, video? }`. An item is a photo by default; when `video` is set it is a **video** and `image` is its poster/thumbnail. `GalleryVideo = { url: string; provider?: "file" | "youtube" | "vimeo" }` — `url` is a direct `mp4/webm` file **or** a YouTube/Vimeo link; `provider` is inferred from the URL when omitted. The full-screen lightbox plays files inline (HTML5) and embeds YouTube/Vimeo. Photos and videos share one ordered `photos[]` stream.

### 5.4 Announcements — `Announcement`

| Method | Endpoint | Query params | Returns | Frontend caller |
|---|---|---|---|---|
| GET | `/announcements` | `fellowship=<slug>`, `limit` | `Announcement[]` — **pinned first, then newest** | `getAnnouncements`, `getAnnouncementsByFellowship` |
| GET | `/announcements/pinned` | — | `Announcement \| null` | `getPinnedAnnouncement` |

`Announcement`: `BaseEntity` + `title`, `body`, `publishedAt`, `pinned: boolean`, `fellowshipSlug?`.

### 5.5 Downloads — `DownloadFile`

| Method | Endpoint | Query params | Returns | Frontend caller |
|---|---|---|---|---|
| GET | `/downloads` | `category=bulletin\|form\|document`, `fellowship=<slug>` | `DownloadFile[]` newest first | `getDownloads`, `getDownloadsByCategory`, `getDownloadsByFellowship` |
| GET | `/downloads/grouped` | — | `{ bulletin: DownloadFile[]; form: DownloadFile[]; document: DownloadFile[] }` | `getDownloadsGrouped` (downloads page makes one call) |

`DownloadFile`: `BaseEntity` + `title`, `description?`, `category`, `fileUrl` (direct file URL), `format` (uppercase ext, e.g. `"PDF"`), `size` (human-readable, e.g. `"1.2 MB"` — backend computes on upload), `publishedAt`, `fellowshipSlug?`.

### 5.6 Fellowships — `Fellowship`

| Method | Endpoint | Returns | Frontend caller |
|---|---|---|---|
| GET | `/fellowships` | `Fellowship[]` sorted by `order` | `getFellowships` |
| GET | `/fellowships/slugs` | `FellowshipSlug[]` | `getFellowshipSlugs` |
| GET | `/fellowships/:slug` | `Fellowship` | `getFellowshipBySlug` |

Slugs are a fixed enum: `youth-fellowship`, `young-couple-fellowship`, `sunday-school`, `choir`, `womens-fellowship`, `mens-fellowship`, `prayer-fellowship`, `other-fellowships`.

`Fellowship`: `BaseEntity` + `name`, `tagline`, `about: LocalizedText[]`, `vision`, `schedule`, `memberCount?`, `banner: ImageAsset`, `committee: { id, name, designation, image? }[]`, `coordinator: { name, phone?, email? }`, `order`.

### 5.7 Leadership — not backed by the API

Pastors, assistant pastors, the committee and the roll of former ministers live in [src/content/leadership.ts](src/content/leadership.ts) and ship with the build. Appointments happen roughly once a year, so the roll is versioned with the code rather than administered in a CMS.

`getLeadership`, `getLeadersByRole`, `getCurrentPastors`, `getAssistantPastors`, `getCommittee`, `getFormerPastors` and `getLeadershipPreview` read straight from that file and **must not be converted to `apiGet`** — the Portal serves no `/leadership` endpoint. To change who is listed, edit that file and redeploy.

### 5.8 Church singletons

**Singleton documents** (one record each), editable in the CMS:

| Method | Endpoint | Returns | Frontend caller |
|---|---|---|---|
| GET | `/church/service-timings` | `ServiceTiming[]` — day/time/service/venue | `getServiceTimings` |
| GET | `/church/pastor-message` | `PastorMessage` — author name/role/image, excerpt, body paragraphs | `getPastorMessage` |
| GET | `/church/weekly-verse` | `WeeklyVerse` — reference, text, `weekOf` | `getWeeklyVerse` |

#### Not backed by the API — hardcoded in this repo

The church **profile**, **history**, **vision & mission** and **diocese** details are written once and revised years apart. Administering them through a CMS meant maintaining editors nobody opens, so they live in [src/content/church.ts](src/content/church.ts) and ship with the build. `getChurchProfile`, `getChurchHistory`, `getVisionMission` and `getDioceseInfo` read straight from there and **must not be converted to `apiGet`** — the Portal serves no such endpoints. To change any of them, edit that file and redeploy.

### 5.9 Contact form (the one write endpoint)

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| POST | `/contact` | `{ name, email, phone?, subject, message }` | `{ success: boolean, messageKey: string }` |

`messageKey` is an i18n key the form surfaces (e.g. `"success"`, `"error"`), **not** a raw display string. Backend should rate-limit + spam-protect this endpoint and email/notify the church office. Wire it in [src/services/contact.service.ts](src/services/contact.service.ts) — it currently resolves with `messageKey: "notConnected"`.

### 5.10 Hero slides — static, no endpoint

Inner-page hero backdrops are hardcoded paths in [src/content/hero-slides.ts](src/content/hero-slides.ts) (`/hero/<section>/01.jpg`…), with one folder per section under `public/hero/`. They are **build assets, not CMS content**: to change a page's hero, drop new files into its folder and adjust the count in that file. The home page's 300-frame cinematic scroll sequence (`public/frames/`) is likewise static.

---

## 6. Media handling requirements

All mock imagery is placeholder stills from `public/frames` (see [src/data/media.ts](src/data/media.ts)). Once the backend serves real media:

1. **Every image is an `ImageAsset`** — the backend must return `url`, localized `alt`, intrinsic `width`/`height`, and ideally a `blurDataURL`. The frontend relies on width/height for layout (`next/image`).
2. Serve images from a stable origin (S3/Cloudinary/self-hosted + CDN). Add that hostname to `images.remotePatterns` in [next.config.ts](next.config.ts).
3. Recommended admin-side endpoints (frontend never calls these): `POST /admin/media` (multipart upload → returns `ImageAsset`, computes dimensions/blur/size server-side), `DELETE /admin/media/:id`.
4. Download files (`fileUrl`) need a public direct-download URL; backend computes `format` and `size` at upload time.
5. **Gallery video** — a `GalleryPhoto.video.url` is a direct `mp4/webm` (served like a download file, no image config needed) or a YouTube/Vimeo link (embedded — nothing to configure). The video's poster is a normal `ImageAsset`, so if posters come from a new CDN host, add it to `images.remotePatterns` like any other image.

---

## 7. Admin / CMS scope (backend-only, no frontend calls yet)

The public site is read-only except `/contact`. Content management happens in an admin app/panel against authenticated CRUD:

- `POST/PATCH/DELETE` for: events, blog posts, gallery albums (+ photo add/remove/reorder), announcements (incl. pin toggle — only one pinned at a time is what the UI expects to surface), downloads, fellowships, leaders, and the singleton church documents.
- Auth: JWT/session-guarded `/admin/**` routes; public `GET` endpoints stay unauthenticated.
- Both `en` and `ta` values required (or defaulted) for every `LocalizedText` field — the frontend does not fall back gracefully to a missing language for content.
- Slugs: generate from the English title, immutable after publish (they're in URLs and `generateStaticParams`).
- On any publish/update/delete, hit the frontend revalidation webhook with the matching cache tag (§4).

### Suggested NestJS module map

```
EventsModule          → /events
BlogModule            → /blog
GalleryModule         → /gallery
AnnouncementsModule   → /announcements
DownloadsModule       → /downloads
FellowshipsModule     → /fellowships
ChurchModule          → /church/{service-timings,pastor-message,weekly-verse}
ContactModule         → /contact (mail + rate limiting)
MediaModule           → /admin/media (upload, image processing)
AuthModule            → admin auth
```

---

## 8. Go-live checklist for wiring the backend

1. Deploy the API; set `NEXT_PUBLIC_API_URL` in the frontend environment.
2. Replace each service body in `src/services/*.service.ts` with the matching `apiGet<T>(...)` call (see table in §5 — callers, types, and pages need **no changes**). **Leave the four hardcoded getters in `church.service.ts` alone** — they are marked in the file and have no endpoint.
3. Point `submitContactForm` at `POST /contact`.
4. Add the `/api/revalidate` route handler and configure the backend publish webhook.
5. Add the media CDN hostname to `next.config.ts` image config.
6. Delete `src/data/*.mock.ts` and `src/data/media.ts` once nothing imports them. **Do not touch `src/content/`** — that is permanent site content, not mock data.
7. Verify both locales render every page — a missing `ta` value on any content record will show as an empty string, not a fallback.

---

## 9. Internationalization & routing notes

- Locales: `en` (default, served at `/`) and `ta` (served at `/ta/...`), via `next-intl` with `localePrefix: "as-needed"` ([src/i18n/routing.ts](src/i18n/routing.ts)).
- Locale negotiation runs in [src/proxy.ts](src/proxy.ts) (Next 16's renamed middleware).
- The blog lives under `/events/blog` (static segment resolves ahead of `/events/[slug]`).
- SEO: `src/app/sitemap.ts` and `robots.ts` build from the slug endpoints — another reason `/…/slugs` endpoints must be cheap.

---

## 10. Design & UX (frontend)

The presentation layer is a bespoke **"Sanctuary" design system** derived from the parish crest — its azure sky, aged-brass gilding and the **crimson of the cross** — set over warm ivory/stone neutrals. Design tokens and utilities live in [src/styles/globals.css](src/styles/globals.css); the shared primitives that carry the look are `Section`/`SectionHeading`, `Card`, the typography set, and the `CrossMark` / `IlluminatedDivider` / `SanctuaryMotes` ornaments in [src/components/common/ornament.tsx](src/components/common/ornament.tsx). Changing the presentation is mostly a matter of editing these — the pages compose from them.

- **Identity** — cross-headed section mastheads, gilded hairline rules, sanctuary window **arches** for portrait/feature imagery, softly-rounded warm cards, illuminated dividers, and a layered "light through glass" section atmosphere. The **App Bar and every Hero section are intentionally preserved** and draw only from the base tokens, so restyling the body never touches them.
- **Cinematic motion** — scroll reveals with a soft blur-rise (`Reveal` / `Stagger`), sparing parallax, slow **Ken-Burns** drift on feature imagery, gently floating gilded motes, lit section seams, and an animated link underline. All GPU transform/opacity and **disabled under `prefers-reduced-motion`**.
- **Forms** — floating-label fields with premium focus states and crimson inline validation ([src/components/ui/input.tsx](src/components/ui/input.tsx)).
- **Gallery** — a **full-screen viewer** (Google-Photos style) that pages through an album's photos **and videos**; `mp4/webm` play inline, YouTube/Vimeo links are auto-detected and embedded (see §5.3). Each fellowship shows a grid of **album cards** — its own event albums plus any `shared` churchwide album.
- **Navigation** — the App Bar's **Fellowships** item has a dropdown of all eight fellowships, driven by data in [src/constants/navigation.ts](src/constants/navigation.ts) (the header component itself is untouched).
- **Services** — the church runs **Tamil-only services**, so service listings carry **no language field** (`ServiceTiming` = day/time/service/venue). This is separate from the site's English/Tamil **UI**, which is unchanged — every page still renders in both languages.

> These are all presentation-layer concerns; none of them change the service layer or the API contract above, except the gallery's `video` / `shared` fields (§5.3) and the dropped `ServiceTiming.language` field.
