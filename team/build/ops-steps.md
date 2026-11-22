# Ops steps: work the repository cannot do

These steps are for whoever administers Vercel, DNS and the Portal VM. The code is already prepared for each one, so no code change is needed when you carry them out. Nothing here has been done to production. Follow the steps in order.

## 0. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Value now | After the steps below | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **set it now** to `https://csistmarks.vercel.app` (unset it defaults to the unregistered `.org`, which breaks share previews) | the approved production origin | canonical, hreflang, sitemap, robots, OG image URLs (F-001, F-016) |
| `NEXT_PUBLIC_API_URL` | `http://129.225.110.39/v1` | `https://api.<domain>/v1` | server-side content fetches, image optimiser allow-list |
| `CONTACT_API_URL` | unset (falls back to `NEXT_PUBLIC_API_URL`) | optional: a private or HTTPS address of the Portal's `/v1` | `/api/contact` forwarder (F-009) |
| `MEDIA_HOSTS` | unset | e.g. `https://media.<domain>` (comma-separated, HTTPS only) | `images.remotePatterns` for uploads moved off the VM (F-031) |
| `REQUIRE_HTTPS_API` | unset | `1` | build fails on a plain-HTTP API; contact forwarder refuses HTTP (F-008, F-031) |
| `REVALIDATE_SECRET` | already set | unchanged | `/api/revalidate` |

Every `*.vercel.app` host, the preview link included, answers `X-Robots-Tag: noindex, nofollow` on every path, whatever `NEXT_PUBLIC_SITE_URL` says. A preview must not be indexed under its own name (F-015). The church domain is never matched.

## 1. Secure the admin portal now (F-008, Critical)

The Portal (`http://129.225.110.39/`, login at `/login`) is reachable over plain HTTP, so passwords and tokens travel unencrypted.

1. **Today:** restrict ports 80/443 on the VM to the office's IPs plus Vercel. In the Oracle Cloud console, go to VCN → Security List / NSG and add ingress rules: allow TCP 80/443 only from the office IPs and from Vercel's egress. Alternatively, put the portal behind Cloudflare Access or Tailscale and close it to the public internet.
2. Choose a domain (step 3) and create `api.<domain>` and `admin.<domain>` A records pointing to `129.225.110.39`. Add Cloudflare proxy if you want it.
3. Install Caddy on the VM (it gets Let's Encrypt certificates automatically). Use this `Caddyfile`:
   ```
   api.<domain> {
     reverse_proxy 127.0.0.1:4000
   }
   admin.<domain> {
     reverse_proxy 127.0.0.1:<portal frontend port>
   }
   http:// {
     redir https://{host}{uri} permanent
   }
   ```
   Bind the Node services to `127.0.0.1` only, so the raw IP no longer serves them.
4. In the Portal backend `.env`, set `TRUST_PROXY` (see `Portal/backend/src/config/configuration.ts` → `trustProxy`) to the loopback proxy (`loopback`). This makes the throttler see real client IPs. Set CORS to the production site origin only (F-068).
5. **Rotate every editor password and the JWT access/refresh secrets.** Existing tokens were exposed over HTTP. Turn on 2FA if the Portal supports it.
6. In Vercel, set `NEXT_PUBLIC_API_URL=https://api.<domain>/v1` and `REQUIRE_HTTPS_API=1`, then redeploy.
7. Check:
   - `curl -I http://129.225.110.39/` should fail or be blocked.
   - `curl -I https://api.<domain>/v1/health` should return 200.

## 2. Contact form (F-009)

The browser now posts to the site's own `/api/contact`, and Vercel forwards to the Portal. The form therefore works on the preview straight away, but the hop from Vercel to the VM is plain HTTP until step 1.6 is done.

- **Throttle:** the Portal limits contact posts to 3 per minute per IP. Every forwarded message arrives from a Vercel IP, so that limit now applies to all visitors together until `trust proxy` is configured (step 1.4). The site applies its own per-visitor limit. If genuine messages are refused, raise the Portal's contact limit in `Portal/backend/src/modules/contact/contact.controller.ts` (for example to 30/min).
- **Test after deploy:** send a message from `/#contact` in both languages and confirm it reaches the Portal inbox.

## 3. Domain (F-001, Critical; after the church approves)

1. Register `csistmarksmadipakkam.org` in the **church's name** (not a volunteer's). Turn on auto-renew and registrar lock, and make sure two trustees hold the credentials.
2. In Vercel → Domains, add the apex and `www`. Set the apex as primary, and make `www` 308 to the apex.
3. At the registrar, add these DNS records (confirm the exact values in Vercel → Domains):
   - `A @ 76.76.21.21`
   - `CNAME www cname.vercel-dns.com`
   - optional: `CAA @ 0 issue "letsencrypt.org"`
4. In Vercel → Domains, redirect `csistmarks.vercel.app` to the apex (308).
5. Set `NEXT_PUBLIC_SITE_URL=https://csistmarksmadipakkam.org` and redeploy. The apex is indexable, and the vercel.app host keeps `noindex` and redirects to the apex (step 4).
6. If the church picks a different domain, set `NEXT_PUBLIC_SITE_URL` to it. Robots, sitemap, canonical and OG all derive from that one variable.
7. Verify the domain in Google Search Console and Bing, then submit `/sitemap.xml`.

## 4. Office email (F-007; after step 3)

1. Create an `office@` mailbox (Google Workspace for Nonprofits or Zoho Mail, both free tiers).
2. Add these DNS records:
   - `MX` from the provider
   - `TXT @ "v=spf1 include:_spf.google.com ~all"`
   - DKIM `TXT` from the admin console
   - `TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@<domain>"`, then tighten to `p=quarantine` after 4 weeks
3. Send a test to Gmail and check that SPF/DKIM/DMARC pass.
4. Only then put the address in `WebsiteRT2/src/content/church-office.ts` → `officeEmails`.

## 5. Media off the VM (F-031, Sprint 2)

1. Create an object-storage bucket, for example Cloudflare R2 (10 GB free, no egress charge), with a custom HTTPS domain such as `media.<domain>`.
2. Copy `/uploads` from the VM, and point the Portal's upload storage at the bucket.
3. Set `MEDIA_HOSTS=https://media.<domain>` in Vercel and redeploy.
4. Once no page references `129.225.110.39`, drop the `NEXT_PUBLIC_API_URL` host from image patterns by moving the API to HTTPS (step 1).

## 6. Old domain csistmarks.com (F-029)

It is registered at GoDaddy until 2027-09-15, with nameservers `ns1/ns2.pgsoftwares.com`, and its DNS returns SERVFAIL.

1. Recover the GoDaddy login from PG Softwares.
2. Move DNS to a working provider.
3. Add the domain to Vercel as a redirect domain, 308 to the production domain.
4. Keep the domain renewed.

## 7. Backups (F-100)

Run a nightly `mongodump` of the Portal DB plus a copy of `/uploads` to off-VM storage, keep 30 days, and test one restore.
