import type { MetadataRoute } from "next";

/**
 * The Portal as an installable app.
 *
 * Served at /manifest.webmanifest and linked from every page by Next. With it
 * (and HTTPS, plus the service worker in `public/sw.js`) Chrome, Edge and
 * Android offer "Install app", and iOS "Add to Home Screen" opens the Portal
 * in its own window rather than a browser tab.
 *
 * Opens on the dashboard: the admin layout sends a signed-out reader on to
 * /login, so one start page serves both. The colours are the light theme's
 * page ground, so the splash an installed app shows while it starts is the
 * same colour as the page that follows it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "St. Mark's Portal",
    short_name: "St. Mark's",
    description:
      "Admin CMS for CSI St. Mark's Church, Madipakkam: manage the public website.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8f7f4",
    theme_color: "#f8f7f4",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press the app icon (Android, Windows, macOS) for these.
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "Events", url: "/events" },
      { name: "Announcements", url: "/announcements" },
      { name: "Messages", url: "/contact-messages" },
    ],
  };
}
