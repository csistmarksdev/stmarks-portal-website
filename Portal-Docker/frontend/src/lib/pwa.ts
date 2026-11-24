"use client";

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
      .catch(() => {
        // Not fatal: the Portal works exactly as before without it.
      });

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}
