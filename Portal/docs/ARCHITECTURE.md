# Portal architecture

## Monorepo

npm workspaces: `shared` (compiled TypeScript package), `backend` (NestJS), `frontend` (Next.js). `shared` builds first; both apps import `@portal/shared`.

- `shared/src/common.ts` + `content.ts` — **field-for-field mirrors of the Website's type files**. These are the public API contract; change them only together with the Website.
- `shared/src/admin.ts` — Portal-only types: publish workflow, RBAC roles + the static `ROLE_PERMISSIONS` matrix (used by the backend guard *and* the CMS UI), users, audit, media, contact inbox, dashboard stats.

## Backend (NestJS)

```
src/
├── main.ts                  helmet, CORS, global prefix, ValidationPipe, Swagger
├── config/configuration.ts  typed env config
├── common/
│   ├── decorators/          @Public, @RequirePermissions, @CurrentUser
│   ├── guards/              JwtAuthGuard (global), PermissionsGuard (global RBAC)
│   ├── filters/             AllExceptionsFilter (error envelope, opaque 500s)
│   ├── dto/                 LocalizedTextDto, ImageAssetDto, PaginationQueryDto, SetStatusDto
│   ├── schemas/             LocalizedText / ImageAsset Mongoose sub-schemas
│   ├── repositories/        BaseRepository<T> (generic data access)
│   └── utils/               slugify, pagination, serialize, format
└── modules/
    ├── auth                 login / refresh (rotating, sha256+bcrypt-hashed) / logout / me
    ├── users                admin user CRUD, self-protection rules
    ├── audit                AuditService.log() + /admin/audit-logs
    ├── media                Multer upload → sharp (dimensions, WebP thumb, blurDataURL)
    ├── events, blog, gallery, announcements, downloads,
    │   fellowships                                public + admin controllers
    ├── church               3 singleton documents (one collection, key + payload)
    ├── contact              public POST /contact + admin inbox
    ├── dashboard            aggregate counts
    └── revalidate           Website ISR webhook trigger (no-op until configured)
```

Patterns:

- **Repository pattern** — controllers → services → `BaseRepository` primitives; controllers never see Mongoose models.
- **Serialization** — `serializeDoc()` converts `_id→id`, Dates→ISO, drops `__v` and (publicly) `status`, guaranteeing wire shapes match the contract types.
- **Publish workflow** — `status: draft|published|archived` on every content schema; public queries filter `status: "published"`. Slug generated from `title.en` at create, unique-suffixed, immutable after publish.
- **RBAC** — `JwtAuthGuard` (skips `@Public()`) then `PermissionsGuard` reads `@RequirePermissions(...)` against `ROLE_PERMISSIONS[user.role]`.
- **Audit** — services call `AuditService.log(actor, action, resource, id, summary)`; audit failure never breaks the operation.
- **Throttling** — global 300 req/min baseline; login 5/min, refresh 20/min, contact 3/min.

## Frontend (Next.js admin CMS)

```
src/
├── app/
│   ├── login/                          public sign-in
│   └── (admin)/                        client-side auth-guarded shell (sidebar + topbar)
│       ├── dashboard, media, users, roles, audit-logs, contact-messages, settings
│       ├── events|blog|announcements|gallery|downloads (+ new, [id])
│       ├── fellowships (custom form: committee + coordinator)
│       └── church/<3 singleton editors>
├── components/ui/                      shadcn-style primitives (Radix + Tailwind 4)
├── components/admin/                   LocalizedField (en/ta), ParagraphsField,
│                                       ImagePicker + MediaLibraryDialog, DataTable pages,
│                                       ResourceListPage / ResourceFormPage (config-driven CRUD)
├── hooks/use-resource.ts               generic TanStack Query CRUD hooks
├── hooks/use-singleton.ts              church singleton GET/PUT hook
└── lib/                                api client (bearer + single-flight refresh), auth context
```

- **Config-driven CRUD** — most entities are a `FieldDef[]` in `src/config/fields.ts` plus ~20-line list/form pages; complex screens (gallery photos, fellowship committee, church singletons, media, users) are custom but reuse the same field components.
- **Auth** — tokens in `localStorage`; the API client retries once after a single-flight refresh, then redirects to `/login`. The UI hides actions the user's role can't perform (the backend enforces regardless).
- **Bilingual editing** — every translatable field renders English + Tamil side by side, because the Website has no language fallback.

## Testing

`backend/scripts/smoke-test.js` (`npm run smoke -w @portal/backend`) boots the compiled app against `mongodb-memory-server`, runs the seed, and asserts the contract end-to-end: response shapes, sorting rules, draft invisibility, publish flow, auth rotation, RBAC denial, audit entries.

## Website integration (future phase)

1. Deploy the Portal; set strong JWT secrets, `PUBLIC_URL`, CORS origins.
2. Set the Website's `NEXT_PUBLIC_API_URL` to the Portal base URL (incl. `/v1`).
3. Swap each Website service body from `mockResponse(...)` to `apiGet<T>(...)` per its README §5 table — no other frontend changes.
4. Add the Website's `/api/revalidate` route and set `WEBSITE_REVALIDATE_URL` + secret here so publishes bust ISR caches instantly.
5. Add the Portal media hostname to the Website's `images.remotePatterns`.
