/**
 * Add (or remove) placeholder gallery videos in the Portal.
 *
 *   node scripts/demo-videos.mjs            add them
 *   node scripts/demo-videos.mjs --remove   take them all back out
 *
 * These exist so the gallery's video playback can be exercised before the
 * church supplies its own recordings. **They are not the parish's content.**
 * Every caption is prefixed with `DEMO —` and every item is removable with one
 * command, so nothing here can quietly reach a live site.
 *
 * The videos are Blender Foundation open movies: Creative Commons, online for
 * over a decade, and obviously not church footage — a placeholder that looks
 * like a real service recording is the one thing worse than no placeholder.
 *
 * Posters come from the Portal's own `/admin/media/video-poster` endpoint,
 * which fetches the YouTube thumbnail into the media library. That is the same
 * path the Portal's UI uses, so the records are indistinguishable from ones an
 * editor would create by hand.
 */

import process from "node:process";

const API = (process.env.PORTAL_API_URL ?? "http://localhost:4000/v1").replace(/\/$/, "");
const EMAIL = process.env.PORTAL_ADMIN_EMAIL ?? "admin@csistmarksmadipakkam.org";
const PASSWORD = process.env.PORTAL_ADMIN_PASSWORD ?? "ChangeMe@123";

const REMOVE = process.argv.includes("--remove");

/** Marks every record this script owns, so removal never guesses. */
const MARKER = "DEMO —";

const DEMO_VIDEOS = [
  {
    album: "easter-2026",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    caption: {
      en: `${MARKER} replace with the Easter service recording`,
      ta: `${MARKER} ஈஸ்டர் ஆராதனை பதிவால் மாற்றவும்`,
    },
  },
  {
    album: "christmas-2025",
    url: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
    caption: {
      en: `${MARKER} replace with the carol service recording`,
      ta: `${MARKER} கிறிஸ்துமஸ் கீர்த்தனை பதிவால் மாற்றவும்`,
    },
  },
  {
    album: "sunday-school-annual-day-2026",
    url: "https://www.youtube.com/watch?v=R6MlUcmOul8",
    caption: {
      en: `${MARKER} replace with the annual day recording`,
      ta: `${MARKER} ஆண்டு விழா பதிவால் மாற்றவும்`,
    },
  },
];

let accessToken = "";

async function request(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = payload?.message ?? `${response.status} ${response.statusText}`;
    throw new Error(
      `${method} ${path} → ${Array.isArray(detail) ? detail.join("; ") : detail}`,
    );
  }
  return payload;
}

async function adminAlbum(slug) {
  const list = await request("GET", "/admin/gallery?pageSize=100");
  const albums = Array.isArray(list) ? list : list.items;
  return albums.find((album) => album.slug === slug) ?? null;
}

async function add() {
  for (const demo of DEMO_VIDEOS) {
    const album = await adminAlbum(demo.album);
    if (!album) {
      console.log(`  ! ${demo.album} — no such album, skipped`);
      continue;
    }

    const already = (album.photos ?? []).some((photo) =>
      photo.video?.url === demo.url,
    );
    if (already) {
      console.log(`  = ${demo.album} — already present`);
      continue;
    }

    // The Portal fetches the real thumbnail; no invented poster.
    const poster = await request("POST", "/admin/media/video-poster", {
      url: demo.url,
    });

    await request("POST", `/admin/gallery/${album.id}/photos`, {
      photos: [
        {
          image: {
            url: poster.url,
            alt: demo.caption,
            width: poster.width,
            height: poster.height,
            ...(poster.blurDataURL ? { blurDataURL: poster.blurDataURL } : {}),
          },
          caption: demo.caption,
          video: { url: demo.url, provider: "youtube" },
        },
      ],
    });

    console.log(`  + ${demo.album} — ${demo.url}`);
  }
}

async function remove() {
  const list = await request("GET", "/admin/gallery?pageSize=100");
  const albums = Array.isArray(list) ? list : list.items;

  let removed = 0;
  for (const album of albums) {
    for (const photo of album.photos ?? []) {
      const isDemo =
        photo.caption?.en?.startsWith(MARKER) ||
        DEMO_VIDEOS.some((demo) => demo.url === photo.video?.url);
      if (!isDemo) continue;

      await request("DELETE", `/admin/gallery/${album.id}/photos/${photo.id}`);
      console.log(`  - ${album.slug} — ${photo.video?.url ?? photo.id}`);
      removed += 1;
    }
  }
  console.log(removed === 0 ? "  nothing to remove" : `  removed ${removed}`);
}

const auth = await request("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
accessToken = auth.accessToken;
console.log(`${REMOVE ? "Removing" : "Adding"} demo videos via ${API}`);

if (REMOVE) await remove();
else await add();
