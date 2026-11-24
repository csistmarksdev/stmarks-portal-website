/*
 * St. Mark's Portal - service worker.
 *
 * What makes the Portal installable as an app, and what it does offline.
 *
 * This is an admin tool over live, signed-in data, so the rule is: nothing a
 * signed-in person sees is ever stored here.
 *
 * - Pages: always from the network. With no network, the offline page instead
 *   of the browser's error - never a stale copy of an admin screen.
 * - /_next/static/*: the app's own code, CSS and fonts. Every file name there
 *   carries a hash of its contents, so a stored copy can never be out of date;
 *   kept, so the app opens instantly and the offline page has its styles.
 * - Everything else (the API at /v1, uploaded media at /uploads, images) is
 *   left to the browser untouched.
 *
 * Bump VERSION when offline.html or the icons change; old caches are cleared
 * when the new worker takes over.
 */
const VERSION = "v1";
const SHELL = `portal-shell-${VERSION}`;
const STATIC = `portal-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const SHELL_FILES = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

/* Keeps the static cache from growing for ever across releases. */
const STATIC_LIMIT = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, STATIC]);
      for (const name of await caches.keys()) {
        if (name.startsWith("portal-") && !keep.has(name)) await caches.delete(name);
      }
      // Lets the browser start the page request while the worker boots.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

async function trimStatic() {
  const cache = await caches.open(STATIC);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - STATIC_LIMIT; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network only, the offline page when there is no network.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          if (preloaded) return preloaded;
          return await fetch(request);
        } catch {
          const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL });
          return offline ?? Response.error();
        }
      })(),
    );
    return;
  }

  // The app's own hashed build files: from the cache, fetched once.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) {
          event.waitUntil(cache.put(request, response.clone()).then(trimStatic));
        }
        return response;
      })(),
    );
    return;
  }

  // The offline page's own files.
  if (SHELL_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request, { cacheName: SHELL }).then((hit) => hit ?? fetch(request)),
    );
  }
});
