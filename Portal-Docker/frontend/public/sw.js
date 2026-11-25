/*
 * St. Mark's Portal - service worker.
 *
 * What makes the Portal installable as an app, and what it does offline.
 *
 * This is an admin tool over live, signed-in data, so the rule is: nothing a
 * signed-in person sees is ever stored here. The one exception is the "Needs
 * attention" widget's three figures (unread messages, approvals waiting, the
 * next public event), handed over by the dashboard and deleted on sign-out.
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
const VERSION = "v2";
const SHELL = `portal-shell-${VERSION}`;
const STATIC = `portal-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const WIDGETS = "portal-widgets";

const SHELL_FILES = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // The widgets' templates, so the Widgets board can draw them offline.
  "/widgets/quick-actions.json",
  "/widgets/quick-actions-data.json",
  "/widgets/attention.json",
  "/widgets/attention-data.json",
];

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
      const keep = new Set([SHELL, STATIC, WIDGETS]);
      for (const name of await caches.keys()) {
        if (name.startsWith("portal-") && !keep.has(name)) await caches.delete(name);
      }
      // Lets the browser start the page request while the worker boots.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
      // A new release may carry new widget templates.
      await refreshInstalledWidgets();
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

/*
 * Keeping the offline page fresh.
 *
 * The offline page and icons are stored once, at install. These refresh them
 * when the browser judges it a good moment, so a long-installed app does not
 * keep showing an offline page from an old release:
 * - `sync` (Background Sync): fires once the connection comes back after the
 *   page asked for it while offline.
 * - `periodicsync` (Periodic Background Sync): fires now and then for an
 *   installed app the reader uses often (Chrome on Android and desktop).
 * Only the shell is refreshed - never an admin screen or any API data.
 */
const SHELL_REFRESH_TAG = "portal-refresh-shell";

async function refreshShell() {
  const cache = await caches.open(SHELL);
  await Promise.all(
    SHELL_FILES.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok) await cache.put(url, response);
      } catch {
        // Still offline: the stored copy stays until next time.
      }
    }),
  );
}

self.addEventListener("sync", (event) => {
  if (event.tag === SHELL_REFRESH_TAG) event.waitUntil(refreshShell());
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === SHELL_REFRESH_TAG) event.waitUntil(refreshShell());
  // The browser's own timer for a widget (its `update` in the manifest).
  else if (WIDGET_TAGS.includes(event.tag)) event.waitUntil(renderWidget(event.tag));
});

/*
 * Push notifications.
 *
 * Ready for when the API sends Web Push (it does not yet: there is no
 * subscription endpoint or VAPID key). A push carries JSON
 * `{ "title", "body", "url" }`; the notification opens `url` in the Portal,
 * focusing a window that is already open rather than starting another.
 */
/* A path inside the Portal, or the dashboard - never another site. */
function sameOriginPath(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin === self.location.origin) return parsed.pathname + parsed.search;
  } catch {
    // Not a URL: fall through.
  }
  return "/dashboard";
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "St. Mark's Portal", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: sameOriginPath(data.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openPortal(sameOriginPath(event.notification.data?.url)));
});

/* Shows `path` in the Portal: the window already open if there is one. */
async function openPortal(path) {
  const target = new URL(path, self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if (client.url === target && "focus" in client) return client.focus();
  }
  const open = windows.find((client) => "navigate" in client);
  if (open) {
    await open.navigate(target);
    return open.focus();
  }
  return self.clients.openWindow(target);
}

/*
 * Widgets on the Windows 11 Widgets board (the manifest's `widgets`).
 *
 * - "quick-actions": buttons straight to the screens used most. No data.
 * - "attention": unread messages, approvals waiting and the next event. The
 *   worker cannot call the API - the sign-in token lives in the page - so the
 *   dashboard posts these figures here each time it loads (lib/pwa.ts), and
 *   the widget says when they were read. Sign-out posts "widgets:clear".
 *
 * Each widget is an Adaptive Card template in /widgets/ plus its data; a
 * button's `verb` is the Portal path it opens.
 */
const WIDGET_TAGS = ["quick-actions", "attention"];
const SUMMARY_URL = "/__widgets/attention-summary";

async function shellText(url) {
  const hit = await caches.match(url, { cacheName: SHELL });
  return (hit ?? (await fetch(url))).text();
}

const whenFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

async function attentionData() {
  const stored = await (await caches.open(WIDGETS)).match(SUMMARY_URL);
  if (!stored) return shellText("/widgets/attention-data.json");

  const { summary, at } = await stored.json();
  const facts = [{ title: "Unread messages", value: String(summary.unreadMessages) }];
  if (summary.awaitingApproval !== null) {
    facts.push({ title: "Awaiting approval", value: String(summary.awaitingApproval) });
  }
  if (summary.nextEvent) {
    const day = new Date(summary.nextEvent.date);
    facts.push({
      title: "Next event",
      value: Number.isNaN(day.getTime())
        ? summary.nextEvent.title
        : `${summary.nextEvent.title}, ${dayFormat.format(day)}`,
    });
  }
  const waiting = summary.unreadMessages + (summary.awaitingApproval ?? 0);
  return JSON.stringify({
    headline:
      waiting === 0 ? "All caught up." : `${waiting} ${waiting === 1 ? "item is" : "items are"} waiting.`,
    facts,
    updated: `As of ${whenFormat.format(new Date(at))}, when the dashboard was last opened`,
  });
}

async function renderWidget(tag) {
  if (!self.widgets) return;
  let payload;
  if (tag === "quick-actions") {
    payload = {
      template: await shellText("/widgets/quick-actions.json"),
      data: await shellText("/widgets/quick-actions-data.json"),
    };
  } else if (tag === "attention") {
    payload = { template: await shellText("/widgets/attention.json"), data: await attentionData() };
  } else {
    return;
  }
  await self.widgets.updateByTag(tag, payload);
}

async function refreshInstalledWidgets(tags = WIDGET_TAGS) {
  if (!self.widgets) return;
  for (const tag of tags) {
    try {
      const widget = await self.widgets.getByTag(tag);
      if (widget?.instances?.length) await renderWidget(tag);
    } catch {
      // Widgets board unavailable: nothing to draw.
    }
  }
}

self.addEventListener("widgetinstall", (event) => {
  event.waitUntil(renderWidget(event.widget.definition.tag));
});

self.addEventListener("widgetresume", (event) => {
  event.waitUntil(renderWidget(event.widget.definition.tag));
});

self.addEventListener("widgetclick", (event) => {
  if (event.action) event.waitUntil(openPortal(sameOriginPath(event.action)));
});

/* Figures from the dashboard, or the sign-out that clears them. */
self.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "widgets:clear") {
    event.waitUntil(
      caches
        .open(WIDGETS)
        .then((cache) => cache.delete(SUMMARY_URL))
        .then(() => refreshInstalledWidgets(["attention"])),
    );
    return;
  }

  if (message.type === "widgets:summary") {
    const { summary } = message;
    const count = (value) => (Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
    const clean = {
      unreadMessages: count(summary?.unreadMessages),
      awaitingApproval: summary?.awaitingApproval == null ? null : count(summary.awaitingApproval),
      nextEvent:
        summary?.nextEvent && typeof summary.nextEvent.title === "string"
          ? { title: summary.nextEvent.title.slice(0, 120), date: String(summary.nextEvent.date) }
          : null,
    };
    const body = JSON.stringify({ summary: clean, at: Date.now() });
    event.waitUntil(
      caches
        .open(WIDGETS)
        .then((cache) =>
          cache.put(SUMMARY_URL, new Response(body, { headers: { "Content-Type": "application/json" } })),
        )
        .then(() => refreshInstalledWidgets(["attention"])),
    );
  }
});
