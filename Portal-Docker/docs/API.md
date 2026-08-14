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

## Backup & restore

One zip holding the whole installation: every collection as canonical Extended
JSON under `db/`, every uploaded file under `uploads/`, and a `manifest.json`
describing both. Nothing is filtered and `_id` is preserved — the archive is a
clone, so restoring it reproduces the installation rather than an export of it.
Media URLs are stored absolute, so they are rewritten to `{{MEDIA}}/…` on the
way out and back to this installation's origin on the way in; an archive taken
from a LAN address restores correctly onto a domain.

| Method | Endpoint | Permission | Notes |
|---|---|---|---|
| GET | `/admin/backup/preview` | `backup.read` | Counts per collection, media file count and bytes, without building anything. |
| POST | `/admin/backup` | `backup.read` | Builds the archive and returns a `BackupTicket` — size, manifest, and a `downloadPath` carrying a one-time token. |
| GET | `/admin/backup/:id/download?token=` | *(token)* | Streams the zip. **Unauthenticated by design**: a browser download is a navigation and cannot send a Bearer header. The token is 256 bits, checked in constant time, scoped to one archive, and expires with it (30 min). |
| POST | `/admin/backup/restore` | `backup.restore` | Multipart `file`. Reads and validates the archive, writes **nothing**, returns a `StagedRestore` with the manifest and any warnings. |
| POST | `/admin/backup/restore/:id` | `backup.restore` | `{ mode, safetyBackup }` — applies the staged archive. |

Upload and apply are two requests so the CMS can show what is in the file
before anyone commits to it, without asking for the upload twice.

**Modes.** `replace` empties each collection the archive contains before
inserting, so the database ends up exactly as it was when the backup was taken —
records created since are gone. `merge` upserts by `_id` and deletes nothing.
For media, `replace` overwrites files and `merge` leaves existing ones alone.
Uploads are restored before the database: a run that dies between the two leaves
orphaned files, which is harmless, rather than records pointing at missing images.

`safetyBackup` (default `true`) takes a full backup *before* applying and
returns its ticket in the response. Its download link is token-based, so it
still works even when the restore has just replaced the account that asked for it.

**Permissions.** `backup.read` and `backup.restore` are both **super-admin only**.
Downloading is held as high as restoring because the archive is the whole
database in one portable file: an admin who can take one has every password hash
in the installation, whether or not they can put one back. And a restore rewrites
the user table, so whoever can run one can hand themselves any account in it.

**Configuration.** `MAX_BACKUP_UPLOAD_MB` (default 4096) caps an uploaded
archive. `BACKUP_WORK_DIR` (default `<tmp>/csistmc-portal-backup`) is where
archives are built and uploads land; point it at a volume when `/tmp` is
smaller than the media library. The directory is wiped at boot and swept on
every request.

## Media hosting

Uploads are stored under `backend/uploads/` and served statically at `PUBLIC_URL/uploads/**` (no API prefix). When integrating the Website, add this hostname to its `next.config.ts` `images.remotePatterns`.
