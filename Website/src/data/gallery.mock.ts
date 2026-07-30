import type { GalleryAlbum, GalleryPhoto } from "@/types/content";
import type { LocalizedText } from "@/types/common";

import { placeholderImage } from "./media";

const timestamps = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

function photos(
  startFrame: number,
  count: number,
  alt: LocalizedText,
): GalleryPhoto[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ph-${startFrame + i * 3}`,
    image: placeholderImage(startFrame + i * 3, alt),
  }));
}

/**
 * A video gallery item: its `image` is the poster still shown in the grid, and
 * `video.url` is the clip that plays in the lightbox. The URL here is a
 * placeholder sample; the church swaps it for its own footage or a YouTube /
 * Vimeo link (e.g. `{ url: "https://youtu.be/…" }`), whose provider the player
 * detects automatically.
 */
function videoItem(
  id: string,
  posterFrame: number,
  url: string,
  alt: LocalizedText,
): GalleryPhoto {
  return { id, image: placeholderImage(posterFrame, alt), video: { url } };
}

export const GALLERY_ALBUMS: GalleryAlbum[] = [
  {
    ...timestamps,
    id: "al-1",
    slug: "harvest-festival-2025",
    title: { en: "Harvest Festival 2025", ta: "அறுவடைத் திருவிழா 2025" },
    description: {
      en: "Thanksgiving, offerings and a full sanctuary.",
      ta: "நன்றி, காணிக்கை, நிறைந்த ஆலயம்.",
    },
    date: "2025-08-17",
    cover: placeholderImage(30, {
      en: "Harvest festival 2025",
      ta: "அறுவடைத் திருவிழா 2025",
    }),
    photos: [
      videoItem(
        "vid-harvest-2025",
        33,
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        {
          en: "Harvest festival highlights",
          ta: "அறுவடைத் திருவிழா சிறப்பம்சங்கள்",
        },
      ),
      ...photos(30, 9, {
        en: "Harvest festival moment",
        ta: "அறுவடைத் திருவிழா தருணம்",
      }),
    ],
  },
  {
    ...timestamps,
    id: "al-2",
    slug: "christmas-2025",
    title: { en: "Christmas 2025", ta: "கிறிஸ்துமஸ் 2025" },
    description: {
      en: "Carols, candles and the children's nativity.",
      ta: "கீர்த்தனைகள், மெழுகுவர்த்திகள், குழந்தைகளின் கிறிஸ்து பிறப்பு நாடகம்.",
    },
    date: "2025-12-24",
    cover: placeholderImage(255, {
      en: "Christmas service 2025",
      ta: "கிறிஸ்துமஸ் ஆராதனை 2025",
    }),
    photos: [
      // A YouTube link — the player detects the provider from the URL and
      // embeds it. Placeholder video; swap for the church's own upload.
      videoItem("vid-christmas-2025", 258, "https://youtu.be/jNQXAC9IVRw", {
        en: "Christmas carol service (video)",
        ta: "கிறிஸ்துமஸ் கீர்த்தனை ஆராதனை (வீடியோ)",
      }),
      ...photos(255, 8, {
        en: "Christmas celebration moment",
        ta: "கிறிஸ்துமஸ் கொண்டாட்ட தருணம்",
      }),
    ],
    // Churchwide festival — shown in every fellowship's gallery.
    shared: true,
  },
  {
    ...timestamps,
    id: "al-3",
    slug: "youth-retreat-2025",
    title: { en: "Youth Retreat 2025", ta: "இளைஞர் தியான முகாம் 2025" },
    description: {
      en: "Two days of worship, teaching and games by the sea.",
      ta: "கடலருகே ஆராதனை, போதனை, விளையாட்டுகளுடன் இரண்டு நாட்கள்.",
    },
    date: "2025-09-06",
    cover: placeholderImage(75, {
      en: "Youth retreat 2025",
      ta: "இளைஞர் தியான முகாம் 2025",
    }),
    photos: photos(75, 8, {
      en: "Youth retreat moment",
      ta: "இளைஞர் முகாம் தருணம்",
    }),
    fellowshipSlug: "youth-fellowship",
  },
  {
    ...timestamps,
    id: "al-4",
    slug: "sunday-school-annual-day-2026",
    title: {
      en: "Sunday School Annual Day 2026",
      ta: "ஞாயிறு பள்ளி ஆண்டு விழா 2026",
    },
    description: {
      en: "Songs, skits and prize giving.",
      ta: "பாடல்கள், நாடகங்கள், பரிசளிப்பு.",
    },
    date: "2026-03-15",
    cover: placeholderImage(105, {
      en: "Sunday school annual day",
      ta: "ஞாயிறு பள்ளி ஆண்டு விழா",
    }),
    photos: photos(105, 7, {
      en: "Sunday school annual day moment",
      ta: "ஞாயிறு பள்ளி விழா தருணம்",
    }),
    fellowshipSlug: "sunday-school",
  },
  {
    ...timestamps,
    id: "al-5",
    slug: "easter-2026",
    title: { en: "Easter 2026", ta: "உயிர்த்தெழுதல் பண்டிகை 2026" },
    description: {
      en: "The sunrise service and breakfast that followed.",
      ta: "விடியற்கால ஆராதனையும் தொடர்ந்த காலை உணவும்.",
    },
    date: "2026-04-05",
    cover: placeholderImage(5, {
      en: "Easter sunrise 2026",
      ta: "உயிர்த்தெழுதல் விடியல் 2026",
    }),
    photos: photos(5, 7, {
      en: "Easter service moment",
      ta: "உயிர்த்தெழுதல் ஆராதனை தருணம்",
    }),
  },
  {
    ...timestamps,
    id: "al-6",
    slug: "womens-fellowship-day-2025",
    title: { en: "Women's Fellowship Day 2025", ta: "மகளிர் ஐக்கிய தினம் 2025" },
    description: {
      en: "A day led by the women of the congregation.",
      ta: "சபை மகளிரால் வழிநடத்தப்பட்ட ஒரு நாள்.",
    },
    date: "2025-10-12",
    cover: placeholderImage(200, {
      en: "Women's fellowship day 2025",
      ta: "மகளிர் ஐக்கிய தினம் 2025",
    }),
    photos: photos(200, 7, {
      en: "Women's fellowship day moment",
      ta: "மகளிர் ஐக்கிய தின தருணம்",
    }),
    fellowshipSlug: "womens-fellowship",
  },
];
