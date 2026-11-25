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
 *
 * Every field PWABuilder's report card asks for is here, and each one does
 * something real:
 * - screenshots: the install dialog's preview (Chrome/Android, Edge, the
 *   Microsoft Store). Taken of the sign-in page, so no church data is in them;
 *   retake with `public/screenshots/README.md` if the sign-in page changes.
 * - share_target: "Share → St. Mark's" from another app opens a new
 *   announcement with what was shared filled in.
 * - protocol_handlers: a `web+stmarks:events/123` link opens that screen in
 *   the installed app (see `app/open/route.ts`).
 * - launch_handler / handle_links: a Portal link opened elsewhere focuses the
 *   window that is already open instead of starting a second copy, and goes
 *   to that link there (`lib/app-launch.ts`).
 * - file_handlers: a backup (.zip) opened with "Open with → St. Mark's Portal"
 *   on the desktop goes to Backup and is read for review, as if chosen there.
 *   The browser offers it for any .zip, since backups have no extension of
 *   their own; the Backup page rejects anything that is not a backup.
 * - widgets: two cards for the Windows 11 Widgets board (Edge) - quick
 *   actions, and what needs attention. Templates in `public/widgets/`, drawn
 *   by `public/sw.js`.
 *
 * Not set, on purpose: iarc_rating_id (an age rating only a store listing
 * issues). related_applications is empty: no store app stands in for this.
 */
const manifest: MetadataRoute.Manifest & {
  // Read by browsers but not yet in Next's type.
  handle_links: "auto" | "preferred" | "not-preferred";
  edge_side_panel: { preferred_width: number };
  widgets: Array<{
    name: string;
    short_name: string;
    description: string;
    tag: string;
    ms_ac_template: string;
    data: string;
    type: string;
    auth: boolean;
    update: number;
    icons: Array<{ src: string; sizes: string; type: string }>;
    screenshots: Array<{ src: string; sizes: string; label: string }>;
  }>;
} = {
  id: "/",
  name: "St. Mark's Portal",
  short_name: "St. Mark's",
  description:
    "Admin CMS for CSI St. Mark's Church, Madipakkam: manage the public website.",
  lang: "en",
  dir: "ltr",
  start_url: "/dashboard",
  scope: "/",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
  orientation: "any",
  background_color: "#f8f7f4",
  theme_color: "#f8f7f4",
  categories: ["productivity", "business"],
  prefer_related_applications: false,
  related_applications: [],
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
  screenshots: [
    {
      src: "/screenshots/login-wide.png",
      sizes: "1280x720",
      type: "image/png",
      form_factor: "wide",
      label: "Signing in to St. Mark's Portal on a computer",
    },
    {
      src: "/screenshots/login-narrow.png",
      sizes: "540x1170",
      type: "image/png",
      form_factor: "narrow",
      label: "Signing in to St. Mark's Portal on a phone",
    },
  ],
  // Long-press the app icon (Android, Windows, macOS) for these.
  shortcuts: [
    {
      name: "Dashboard",
      description: "What needs attention today",
      url: "/dashboard",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: "Events",
      description: "Services and church events",
      url: "/events",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: "Announcements",
      description: "Notices for the congregation",
      url: "/announcements",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: "Messages",
      description: "Messages sent from the website",
      url: "/contact-messages",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  ],
  share_target: {
    action: "/announcements/new",
    method: "GET",
    params: { title: "title", text: "text", url: "url" },
  },
  protocol_handlers: [{ protocol: "web+stmarks", url: "/open?to=%s" }],
  launch_handler: { client_mode: ["focus-existing", "auto"] },
  handle_links: "preferred",
  edge_side_panel: { preferred_width: 480 },
  file_handlers: [{ action: "/backup", accept: { "application/zip": [".zip"] } }],
  widgets: [
    {
      name: "Quick actions",
      short_name: "Quick actions",
      description: "Start an announcement or event, or open messages or backup",
      tag: "quick-actions",
      ms_ac_template: "/widgets/quick-actions.json",
      data: "/widgets/quick-actions-data.json",
      type: "application/json",
      auth: false,
      update: 86400,
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      screenshots: [
        { src: "/widgets/quick-actions-preview.png", sizes: "600x608", label: "Quick actions widget" },
      ],
    },
    {
      name: "Needs attention",
      short_name: "Attention",
      description: "Unread messages, approvals waiting and the next event",
      tag: "attention",
      ms_ac_template: "/widgets/attention.json",
      data: "/widgets/attention-data.json",
      type: "application/json",
      auth: false,
      update: 3600,
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      screenshots: [
        { src: "/widgets/attention-preview.png", sizes: "600x608", label: "Needs attention widget" },
      ],
    },
  ],
};

export default function manifestRoute(): MetadataRoute.Manifest {
  return manifest;
}
