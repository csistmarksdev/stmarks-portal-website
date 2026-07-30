# Portal API

Base URL: `http://localhost:4000/v1` (prefix configurable via `API_PREFIX`).
Interactive documentation: **Swagger UI at `/docs`** — every endpoint, DTO and enum is documented there; this file is the map.

A ready-to-import **Postman collection + environment** lives in [`docs/postman/`](postman/README.md) — import both files, run *Auth → Login*, and every request works.

## Conventions

- All responses are JSON. Localized fields always contain both `en` and `ta`. Dates are ISO 8601 strings.
- Public list endpoints return a **plain array**; adding `?page=` or `?pageSize=` switches the response to `Paginated<T>` = `{ items, total, page, pageSize, hasMore }`.
- Public endpoints serve **published** records only and omit the internal `status` field. Admin responses include `status`.
- Errors use the envelope `{ statusCode, error, message, path, timestamp }`.

## Public endpoints (the Website contract — §5 of Website/README.md)

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/events` | `status=upcoming\|past`, `fellowship`, `featured=true`, `limit`, `page`, `pageSize`. Newest first; upcoming ascending. Event status derived from dates. |
| GET | `/events/slugs` | `string[]` for `generateStaticParams` |
| GET | `/events/:slug` | 404 when missing/unpublished |
| GET | `/blog` | `event=<eventSlug>`, `fellowship`, `limit`, paging. Newest first by `publishedAt`. `readingMinutes` computed server-side. |
| GET | `/blog/slugs` · `/blog/:slug` | |
| GET | `/gallery` | `fellowship`, `limit`, paging. Newest first by album `date`. Includes `photos[]`. **`?fellowship=X` returns albums where `fellowshipSlug === X` *or* `shared === true`** — a shared album is churchwide (e.g. Christmas) and appears in every fellowship's gallery. |
| GET | `/gallery/slugs` · `/gallery/:slug` | |
| GET | `/announcements` | `fellowship`, `limit`. **Pinned first, then newest.** |
| GET | `/announcements/pinned` | `Announcement \| null` |
| GET | `/downloads` | `category=bulletin\|form\|document`, `fellowship`. Newest first. |
| GET | `/downloads/grouped` | `{ bulletin[], form[], document[] }` |
| GET | `/fellowships` | Sorted by `order`. Slugs are the fixed 8-value enum. |
| GET | `/fellowships/slugs` · `/fellowships/:slug` | |
| GET | `/church/service-timings` · `/church/pastor-message` · `/church/weekly-verse` | Singleton documents |
| POST | `/contact` | Body `{ name, email, phone?, subject, message }` → `{ success, messageKey }`. Rate-limited 3/min/IP. |

**Gallery items.** `photos[]` is one ordered stream of photos **and** videos: an item with `video: { url, provider }` is a video whose `image` is its poster frame. `provider` (`youtube` / `vimeo` / `file`) is inferred from the URL server-side on write, so clients never have to guess.

YouTube and Vimeo links are validated against the same patterns the Website's player uses to build its embed URL (`Website/src/features/gallery/photo-grid.tsx`) — a link with no extractable video id is rejected with **400** rather than stored, because on the live site it would render an empty player with no indication why. Direct `mp4`/`webm` URLs only need to be well-formed. Rejection applies to the whole batch, so a bad link never lands half-applied.

**Church content the API does not serve.** The church profile, history, vision & mission, diocese details, the **leadership roll** and hero-slide imagery are **hardcoded in the Website** (`Website/src/content/`). They are written once and revised years apart, so putting them behind a CMS meant maintaining editors nobody opens. There is deliberately no `/church/profile`, `/church/history`, `/church/vision-mission`, `/church/diocese`, `/leadership` or `/hero-slides` endpoint — the smoke test asserts these return 404, and `npm run check:contract` fails if those types reappear in `shared/`.

## Auth

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ user, accessToken, refreshToken }`. 5/min/IP. |
| POST | `/auth/refresh` | `{ refreshToken }` → new pair. Tokens rotate; reuse of an old token is rejected. |
| POST | `/auth/logout` | Revokes the stored refresh token. Bearer required. |
| GET | `/auth/me` | Current user. Bearer required. |

Access tokens expire in 15 min (config `JWT_ACCESS_EXPIRES`), refresh in 7 days. All `/admin/**` routes require `Authorization: Bearer <accessToken>` and role permissions (see `shared/src/admin.ts`).

## Admin endpoints

Standard CRUD shape for each content collection `X ∈ events, blog, gallery, announcements, downloads, fellowships`:

- `GET /admin/X` — paginated, `search`, `status` filters (+ resource-specific filters)
- `GET /admin/X/:id` · `POST /admin/X` · `PATCH /admin/X/:id` · `DELETE /admin/X/:id`
- `PATCH /admin/X/:id/status` — `{ status: draft|published|archived }`

Extras:

- `PATCH /admin/announcements/:id/pin` — `{ pinned }`; pinning unpins all others.
- `POST /admin/gallery/:id/photos` — takes an **array** of `{ image, caption?, video? }`, so a whole batch lands in one request; the CMS picker sends every ticked photo at once. Also `PATCH /admin/gallery/:id/photos/reorder` · `DELETE /admin/gallery/:id/photos/:photoId`. Albums accept `shared: true` for churchwide albums.
- `GET/PUT /admin/church/<key>` for `service-timings, pastor-message, weekly-verse`
- `POST /admin/media` (multipart `file`, optional `altEn`/`altTa`) → media item with computed `format` and `size`; images also get `width/height`, a thumbnail and `blurDataURL`. Accepts **images, videos** (mp4/webm/ogg/mov), PDFs and office documents. Videos have their own size ceiling (`MAX_VIDEO_UPLOAD_MB`, default 200 MB) since `MAX_UPLOAD_MB` (15 MB) suits photos and bulletins. `GET /admin/media`, `PATCH /admin/media/:id` (alt), `DELETE /admin/media/:id`
- `POST /admin/media/video-poster` — `{ url }` for a YouTube/Vimeo link. Downloads that clip's own thumbnail into the library and returns it like any upload, so adding a video needs nothing but its link. The image is **copied, not hot-linked**, keeping the Website on a single image origin. Returns **422** when no thumbnail is available (unparseable link, a direct video file, or no outbound network), and the CMS then asks for a poster upload instead.
- `GET/POST/PATCH/DELETE /admin/users`, `PATCH /admin/users/:id/password`
- `GET /admin/audit-logs` — filters `action`, `resource`, `userId`
- `GET /admin/contact-messages`, `PATCH /admin/contact-messages/:id/read`, `DELETE /admin/contact-messages/:id`
- `GET /admin/dashboard/stats`

## Media hosting

Uploads are stored under `backend/uploads/` and served statically at `PUBLIC_URL/uploads/**` (no API prefix). When integrating the Website, add this hostname to its `next.config.ts` `images.remotePatterns`.
