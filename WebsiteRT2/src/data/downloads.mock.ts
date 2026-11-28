import type { DownloadFile } from "@/types/content";

const timestamps = {
  createdAt: "2017-10-01T00:00:00.000Z",
  updatedAt: "2026-11-28T00:00:00.000Z",
};

/**
 * The church's own forms, carried over from the previous website
 * (csistmarks.com, "Our Pastors" page). The files ship in
 * `public/downloads/`, so these links work with or without the Portal.
 *
 * The previous website's other downloads, the "Marg Malar" magazines, are
 * deliberately not here: each issue is for private circulation and lists
 * members' birthdays, addresses and phone numbers. See
 * docs/legacy-site-migration.md.
 */
export const DOWNLOADS: DownloadFile[] = [
  {
    ...timestamps,
    id: "dl-1",
    slug: "family-membership-form-english",
    title: {
      en: "Family Membership Form (English)",
      ta: "குடும்ப உறுப்பினர் படிவம் (ஆங்கிலம்)",
    },
    description: {
      en: "To join the church, fill in this form for your family and hand it to the church office.",
      ta: "ஆலயத்தில் உறுப்பினராக, உங்கள் குடும்பத்திற்கான இந்தப் படிவத்தை நிரப்பி ஆலய அலுவலகத்தில் ஒப்படையுங்கள்.",
    },
    category: "form",
    fileUrl: "/downloads/family-membership-form-english.pdf",
    format: "PDF",
    size: "70 KB",
    publishedAt: "2017-10-01",
  },
  {
    ...timestamps,
    id: "dl-2",
    slug: "family-membership-form-tamil",
    title: {
      en: "Family Membership Form (Tamil)",
      ta: "குடும்ப விவரப்பட்டியல் (தமிழ்)",
    },
    description: {
      en: "The same membership form, in Tamil.",
      ta: "அதே உறுப்பினர் படிவம், தமிழில்.",
    },
    category: "form",
    fileUrl: "/downloads/family-membership-form-tamil.pdf",
    format: "PDF",
    size: "150 KB",
    publishedAt: "2017-10-01",
  },
];
