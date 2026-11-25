"use client";

import { startAppLaunch } from "./app-launch";

/**
 * The Portal as an installed app: registers the service worker
 * (`public/sw.js`), once, from the root providers.
 *
 * Installing is left to the browser's own controls - the install icon in
 * Chrome's and Edge's address bar, "Install app" in Android Chrome's menu,
 * Share → Add to Home Screen on iOS - which the manifest (`app/manifest.ts`)
 * and this worker make available.
 *
 * Service workers only run on a secure origin (HTTPS, or localhost). Over
 * plain HTTP this does nothing and browsers offer no install; the manifest
 * still lets iOS add the Portal to the home screen as a standalone window.
 */

let started = false;

export function startPwa(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  // A link, shortcut or backup file the installed app was opened with.
  startAppLaunch();

  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  if (process.env.NODE_ENV !== "production") {
    // A worker left over from a production run on this origin would serve
    // stale build files to the dev server; clear it rather than register.
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((r) => void r.unregister()));
    return;
  }

  const register = () =>
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(scheduleShellRefresh)
      .catch(() => {
        // Not fatal: the Portal works exactly as before without it.
      });

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}

/* Must match SHELL_REFRESH_TAG in `public/sw.js`. */
const SHELL_REFRESH_TAG = "portal-refresh-shell";

type SyncRegistration = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> };
  periodicSync?: { register(tag: string, options: { minInterval: number }): Promise<void> };
};

/**
 * Asks the worker to refresh the offline page now and then (Periodic
 * Background Sync, installed app only), and once the connection returns after
 * going offline (Background Sync). Both are Chrome/Edge features; elsewhere,
 * or when the browser declines, nothing happens and nothing is lost.
 */
function scheduleShellRefresh(registration: SyncRegistration): void {
  void registration.periodicSync
    ?.register(SHELL_REFRESH_TAG, { minInterval: 24 * 60 * 60 * 1000 })
    .catch(() => {});

  window.addEventListener("offline", () => {
    void registration.sync?.register(SHELL_REFRESH_TAG).catch(() => {});
  });
}

/**
 * What the "Needs attention" widget (Windows 11 Widgets board) shows.
 *
 * The worker cannot call the API itself - the sign-in token lives in the
 * page - so the dashboard hands it these counts each time it loads, and the
 * widget shows them with the time they were read. Counts and the next public
 * event only: no names, no message text. Signing out clears them.
 */
export interface WidgetSummary {
  unreadMessages: number;
  /** Null for someone who cannot approve - the widget then leaves it out. */
  awaitingApproval: number | null;
  nextEvent: { title: string; date: string } | null;
}

function postToWorker(message: unknown): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage(message))
    .catch(() => {});
}

export function publishWidgetSummary(summary: WidgetSummary): void {
  postToWorker({ type: "widgets:summary", summary, at: Date.now() });
}

export function clearWidgetSummary(): void {
  postToWorker({ type: "widgets:clear" });
}
