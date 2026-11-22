# Build plan — audit fixes 2026-11 (branch `fix/audit-2026-11`)

App: `WebsiteRT2/` (Next 16.4, next-intl 4, App Router, `src/proxy.ts` = middleware).
Content sources found in the repo:

| Data | Source | Editable here? |
|---|---|---|
| Name, address, phone, email, socials, history, diocese | `src/content/church.ts` | yes |
| Leaders, presbyter roll | `src/content/leadership.ts` | yes |
| UI strings, site description | `src/messages/{ta,en}.json` | yes |
| Service timings, pastor message, verse of the week | Portal API `/church/*` (mock fallback `src/data/church.mock.ts`) | CMS only (site can guard/hide) |
| Announcements, events, blog, gallery, fellowships, downloads | Portal API `/v1/*` via `src/services/*` | CMS only (site can guard/hide) |
| Metadata | `src/app/[locale]/layout.tsx` + each route's `generateMetadata` | yes |
| Admin portal / API host | `Portal/` on 129.225.110.39 | ops (`ops-steps.md`) |

Every church fact that is unknown lives in **one file**: `WebsiteRT2/src/content/church-office.ts` (`TODO(church-office)`), listed in `church-office-todo.md`.

**Client scope decision (22 Nov):** the new pages in the handoff that are not fixes (watch/live stream, give, festivals, worship/sacraments hub, sermons, membership/new-here, history page) are deferred. Instead, add one short bilingual note on Sunday School, baptism and weddings that points to the Hon. Secretary / Hon. Treasurer. Their contact details stay TODO(church-office).

## Parallel work (separate worktrees, no shared files)

| Stream | Owner | Files (exclusive) |
|---|---|---|
| A. Perf assets | subagent `perf` | `src/components/common/splash-screen.tsx`, `src/lib/splash-montage.ts`, `src/layouts/site-footer.tsx`, `public/brand/*` (new) |
| B. Header / a11y / Tamil type | subagent `header` | `src/layouts/site-header.tsx`, `src/components/common/language-switcher.tsx`, `src/constants/navigation.ts`, `src/styles/globals.css`, `src/providers/lenis-provider.tsx`, `src/lib/scroll-offsets.ts` |
| C. SEO, content, services, contact | me | everything else (`layout.tsx`, route pages, `src/lib/seo.ts`, sitemap, robots, manifest, `next.config.ts`, `src/content/*`, `src/messages/*`, `src/services/*`, `src/app/api/contact`, contact form, `public/og/*`) |

Message keys that B needs (`nav.serviceTimes`, `common.switchTo*`) are added by C before B starts.

## Sprint 1 (28)

| ID | Sev | Action | Files | Expected status |
|---|---|---|---|---|
| F-001 | C | Already env-driven (`NEXT_PUBLIC_SITE_URL`); document; derive robots/sitemap/OG from it | `constants/site.ts`, `ops-steps.md` | blocked(church-office) |
| F-002 | C | `pageMetadata()` helper: self canonical + ta/en/x-default per route; layout no longer sets alternates | `lib/seo.ts`, `[locale]/layout.tsx`, `[locale]/page.tsx`, all route pages | fixed |
| F-003 | C | Service-layer guard hides records titled/slugged sample/test/demo/மாதிரி; sitemap uses same guard. Deleting in CMS = content task | `services/guards.ts`, services, `sitemap.ts` | partial |
| F-004 | C | Guard hides media items whose title/alt/caption contains DEMO; real photos needed | `services/gallery.service.ts` | partial / blocked(church-office) |
| F-005 | C | Guard hides events whose slug year ≠ start-date year (the 2027 record) | `services/guards.ts`, events service | partial / blocked(church-office) |
| F-006 | C | Correct BSI O.V. text in fallback; verse hidden if stale (>10 days, F-025); CMS text must be updated | `data/church.mock.ts`, `features/home/verse-of-week.tsx`, church service | partial |
| F-007 | C | Remove placeholder phone + unregistered-domain email; render nothing when empty; TODO | `content/church-office.ts`, `content/church.ts`, contact/footer consumers | blocked(church-office) |
| F-008 | C | Ops only; HTTPS-only API base enforced in code | `ops-steps.md`, `next.config.ts` | blocked(ops) |
| F-009 | C | Same-origin `POST /api/contact` route → server-side forward to `CONTACT_API_URL` (HTTPS required in prod); honeypot + maxLength; client never calls raw IP | `app/api/contact/route.ts`, `services/contact.service.ts`, `features/contact/contact-form.tsx` | fixed (code) / blocked(ops) for HTTPS backend |
| F-010 | H | CMS data; nothing invented | — | blocked(church-office) |
| F-011 | H | CMS data | — | blocked(church-office) |
| F-012 | H | Add Rev. V. Pavun Sangeetha "June 2026 – present" (handoff text; reconfirm) | `content/leadership.ts` | partial (reconfirm) |
| F-013 | H | Tamil history para 2+3 → content_fixes CT-08 / CT-16 (அருள்திரு, past tense); EN para 2 → CT-33 for parity | `content/church.ts` | fixed |
| F-014 | H | ta `site.description` → suggested_text | `messages/ta.json` (manifest reads it) | fixed |
| F-015 | H | `X-Robots-Tag: noindex` + robots disallow on any host ≠ production host | `next.config.ts`, `app/robots.ts` | fixed |
| F-016 | H | `public/og/default.jpg` 1200×630; og:url, og:locale + alternate on every page; CMS images in og via HTTPS `/_next/image` | `lib/seo.ts`, routes, `public/og/default.jpg` | fixed |
| F-017 | H | Splash: home only, once per session, ≤600 ms, skipped for reduced motion / Simple mode, no 54-frame preload | stream A | fixed |
| F-018 | H | Logos → 2× WebP (<15 KB); no preload; long cache | stream A + B (header src), `next.config.ts` | fixed |
| F-019 | H | Top-level "Service Times" item; drop duplicate Contact from About submenu | stream B | fixed |
| F-020 | H | `scroll-margin-top` on sections; Lenis anchor offset | stream B | partial (needs browser check) |
| F-021 | H | Switcher = `<a hreflang lang>` links keeping hash, ≥44 px, visible in mobile header | stream B | fixed |
| F-022 | M | `:lang(ta)` letter-spacing normal, line-height floors | stream B | fixed |
| F-023 | H | Mobile menu: role=dialog, aria-modal, focus trap, inert background, Esc, focus return | stream B | fixed |
| F-024 | H | Diocese image alt → "Emblem of the Church of South India" / "தென்னிந்திய திருச்சபையின் இலச்சினை" | `content/church.ts` | fixed (official crest = church-office) |
| F-025 | H | Verse shown only if dated ≤10 days; announcement expiry needs CMS field (F-049) | `verse-of-week.tsx` | partial |
| F-026 | H | Advent–New Year schedule from office | — | blocked(church-office) |
| F-027 | H | Consent needed; phones kept behind one flag in `church-office.ts` | `content/church-office.ts`, leadership consumers | blocked(church-office) |
| F-028 | H | Authors from office | — | blocked(church-office) |
| (client) | — | Sunday School / baptism / wedding note → Secretary / Treasurer | messages, contact section | fixed (contacts TODO) |

## Sprint 2 (22)

| ID | Action | Files | Expected |
|---|---|---|---|
| F-029, F-030 | off-site | `ops-steps.md` | blocked(church-office) |
| F-031 | `images.remotePatterns` https-only in prod; API base from env; ops move uploads | `next.config.ts`, `ops-steps.md` | partial / blocked(ops) |
| F-032, F-033, F-094 | Replace frame sequences with poster image; remove Lenis | `features/cinematic/*`, `providers/lenis-provider.tsx`, layout | fixed (measure) |
| F-034 | Marquee ×2, inline SVG to file, client message namespaces | home sections, layout | partial |
| F-036 | Privacy page + form consent line (LEGAL text); Grievance Officer/retention TODO | `app/[locale]/privacy`, contact form, footer | partial |
| F-037 | Photo-consent line on gallery (LEGAL-05) without the dead email | gallery pages | blocked(church-office) for contact |
| F-038, F-039, F-040, F-041 | **Deferred by client** (except the short note added in Sprint 1) | — | wontfix (deferred by client) |
| F-042 | Hide empty blocks / zero counts on fellowship pages; copy = office | `fellowships/[slug]/page.tsx` | partial |
| F-043 | Church JSON-LD (no phone until confirmed), Event, Article, BreadcrumbList | `lib/seo.ts`, routes | fixed |
| F-045 | Tamil min 14 px labels | `globals.css`, typography | fixed |
| F-046 | Filename alts hidden (alt="" fallback → descriptive generic); CMS alt work | gallery components | partial |
| F-047 | CSI Tamil glossary in repo strings (பேராயம், பேராயர், அருள்திரு, சேகரம், திருவிருந்து) | `content/*`, `messages/ta.json` | fixed (repo) / CMS partial |
| F-048 | "This Sunday" strip in first viewport (times from CMS, address, Directions); /visit etc. deferred | home | partial |
| F-049, F-050 | CMS model changes in `Portal/` | `ops-steps.md` | blocked(ops) |

## Sprint 3 (68)

Dev items to do in code: F-051 (alternateLinks off), F-052 (real 404 status), F-059 (Intl ranges, காலை/மாலை), F-066 (Advent, no `?season=` in prod), F-067 (security headers), F-068 (rate limit/honeypot), F-069 (`vercel.json` regions bom1), F-070 (fonts), F-071 (click-to-load map), F-072 (cookie), F-073 (contrast tokens), F-074 (lang=en runs), F-075 (headings), F-076 (tel aria-label), F-077 (keyboard dropdowns), F-078 (lightbox focus), F-079 (dl markup), F-080 (Tamil clamp), F-081 (44 px), F-082 (opaque header), F-083 (mobile wordmark), F-084 (back links), F-085 (Tamil h1 scale), F-086 (initials), F-089 (titles/descriptions), F-090 (Vercel Analytics: decision), F-096 (visible by default), F-103 (sitemap lastmod), F-104 (h1), F-107 (poweredByHeader), F-111 (manifest/favicon), F-112, F-113, F-114, F-116, F-117, F-119, F-120.
Content items with given text: F-054, F-055, F-057, F-058, F-062, F-063, F-064 (welcome text), F-065 (needs translation choice → church-office), F-091 (repo strings only), F-105 (CMS), F-106.
Blocked/deferred: F-035, F-093, F-092 (deferred by client); F-044, F-056, F-087, F-088, F-098, F-108, F-115 (church-office); F-053, F-060, F-061, F-097, F-099, F-101 (CMS/content); F-095, F-100, F-109, F-110 (Portal/ops).
