# Service layer

All content reaches the UI through this folder. Components never import from
`src/data/*` and never hardcode content.

## Current state - connected

Every service that the Portal owns now reads from the API, keyed off
`NEXT_PUBLIC_API_URL` (`.env.local` → `http://localhost:4000/v1`).

The mocks in `src/data/*.mock.ts` have **not** been deleted. They are the
fallback for an unconfigured environment: with `NEXT_PUBLIC_API_URL` empty the
site still renders from them, which keeps the project runnable without a
backend. That is a *configuration* fallback only - once the variable is set a
failed request throws, because silently serving last year's events is worse
than an error page.

```ts
export function getEvents(): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", {
    tags: ["events"],
    fallback: () => [...EVENTS].sort(descending),
  });
}
```

### Helpers in `http.ts`

| Helper | Use |
|---|---|
| `apiGet<T>` | List and singleton reads; supports `params`, `tags`, `revalidate`, `fallback` |
| `apiGetOrNull<T>` | The `*BySlug` reads. Translates the API's 404 into `null` - a missing album is an empty state, not an error. Only 404 is swallowed. |
| `apiPost<T>` | The contact form. No fallback: pretending a message was delivered would be a lie. |

List endpoints return a **bare array** unless `page`/`pageSize` is passed, and
they honour `limit` - which is why the service signatures did not change.

### What is *not* connected, and why

| Source | Reason |
|---|---|
| `getLeadership`, `getChurchProfile`, `getChurchHistory`, `getVisionMission`, `getDioceseInfo` | Permanent site content in `src/content/*`. There is no endpoint and there must not be one. |
| Downloads | The endpoint exists and the service is wired, but no records were migrated - see below. |

## Migrating content into the Portal

`scripts/migrate-to-portal.mjs` pushes the mock content into the Portal through
its **admin HTTP API**, so records get the same validation, slug rules and audit
trail a human editor's changes would. It is idempotent - re-running only fills
in what is missing.

```bash
node --import ./scripts/ts-resolve-hook.mjs scripts/migrate-to-portal.mjs --dry-run
node --import ./scripts/ts-resolve-hook.mjs scripts/migrate-to-portal.mjs
```

Three things it handles that are easy to get wrong:

- **Slugs.** The API derives a slug from `title.en` on create, which would turn
  `harvest-festival-2026` into `harvest-festival` and break both the public URL
  and the `eventSlug` cross-references in the blog posts. Records are created as
  drafts, PATCHed to their intended slug while the API still allows it, then
  published.
- **Images.** The mocks reference `/frames/*.jpg` inside this project's
  `public/`. Each distinct file is uploaded into the Portal's media library and
  the records rewritten to the returned absolute URL, so the Portal owns the
  media rather than depending on this dev server. `next.config.ts` derives its
  `images.remotePatterns` from `NEXT_PUBLIC_API_URL` so the optimiser accepts
  them.
- **Album photos.** They are *not* part of `POST /admin/gallery` - they have
  their own endpoint. Because the API validates with `whitelist: true`, sending
  them to create is stripped in silence and the album is created empty. They are
  appended explicitly.
- **Records that already exist are topped up, not skipped.** Fellowships are
  seeded by the Portal, so a plain existence check left them without banners,
  committees or coordinators. Existing records are filled field by field, and
  the Portal's shared `placeholder.jpg` banner counts as unset so each
  fellowship gets its own photograph. A banner somebody actually uploaded
  through the Portal is treated as real content and never overwritten.

Re-running when everything is in place reports `created 0, failed 0`.

**Downloads are deliberately not migrated.** Every `fileUrl` in the mock points
at a PDF that does not exist - there is no `public/downloads/`, so those links
already 404 today. Upload the real bulletins and forms through the Portal's
Downloads screen; the script prints the titles for reference.

## Content shape

Translatable content fields use `LocalizedText` (`{ en: string; ta: string }`)
rather than a single string, matching how the API will return records. Resolve
them in components with `localize(field, locale)` from `@/lib/localize`.

UI chrome - button labels, section headings, form errors - is **not** content.
It lives in `src/messages/{en,ta}.json` and is read with `useTranslations()`.
