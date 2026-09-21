import type { DownloadFile } from "@/types/content";

const timestamps = {
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

/**
 * `fileUrl` values point at paths the media service will serve. Until the
 * backend exists these resolve to nothing, so the UI links are rendered but
 * will 404 if followed - replace with real URLs on integration.
 */
export const DOWNLOADS: DownloadFile[] = [
  {
    ...timestamps,
    id: "dl-1",
    slug: "bulletin-2026-07-19",
    title: { en: "Weekly Bulletin - 19 July 2026", ta: "வாராந்திர அறிக்கை - 19 ஜூலை 2026" },
    description: {
      en: "Order of service, readings and notices for this Sunday.",
      ta: "இந்த ஞாயிற்றுக்கிழமைக்கான ஆராதனை ஒழுங்கு, வாசகங்கள், அறிவிப்புகள்.",
    },
    category: "bulletin",
    fileUrl: "/downloads/bulletin-2026-07-19.pdf",
    format: "PDF",
    size: "420 KB",
    publishedAt: "2026-07-18",
  },
  {
    ...timestamps,
    id: "dl-2",
    slug: "bulletin-2026-07-12",
    title: { en: "Weekly Bulletin - 12 July 2026", ta: "வாராந்திர அறிக்கை - 12 ஜூலை 2026" },
    category: "bulletin",
    fileUrl: "/downloads/bulletin-2026-07-12.pdf",
    format: "PDF",
    size: "408 KB",
    publishedAt: "2026-07-11",
  },
  {
    ...timestamps,
    id: "dl-3",
    slug: "bulletin-2026-07-05",
    title: { en: "Weekly Bulletin - 5 July 2026", ta: "வாராந்திர அறிக்கை - 5 ஜூலை 2026" },
    category: "bulletin",
    fileUrl: "/downloads/bulletin-2026-07-05.pdf",
    format: "PDF",
    size: "396 KB",
    publishedAt: "2026-07-04",
  },
  {
    ...timestamps,
    id: "dl-4",
    slug: "baptism-application-form",
    title: { en: "Baptism Application Form", ta: "ஞானஸ்நான விண்ணப்பப் படிவம்" },
    description: {
      en: "To be completed and submitted to the church office one month in advance.",
      ta: "ஒரு மாதத்திற்கு முன்பே நிரப்பி திருச்சபை அலுவலகத்தில் சமர்ப்பிக்க வேண்டும்.",
    },
    category: "form",
    fileUrl: "/downloads/baptism-application-form.pdf",
    format: "PDF",
    size: "180 KB",
    publishedAt: "2026-01-15",
  },
  {
    ...timestamps,
    id: "dl-5",
    slug: "marriage-banns-form",
    title: { en: "Marriage Banns Form", ta: "திருமண அறிவிப்புப் படிவம்" },
    description: {
      en: "Required for marriages solemnised at St. Mark's.",
      ta: "தூய மாற்கு ஆலயத்தில் நடைபெறும் திருமணங்களுக்குத் தேவை.",
    },
    category: "form",
    fileUrl: "/downloads/marriage-banns-form.pdf",
    format: "PDF",
    size: "165 KB",
    publishedAt: "2026-01-15",
  },
  {
    ...timestamps,
    id: "dl-6",
    slug: "membership-transfer-form",
    title: { en: "Membership Transfer Form", ta: "உறுப்பினர் மாற்றுப் படிவம்" },
    category: "form",
    fileUrl: "/downloads/membership-transfer-form.pdf",
    format: "PDF",
    size: "142 KB",
    publishedAt: "2026-01-15",
  },
  {
    ...timestamps,
    id: "dl-7",
    slug: "annual-report-2025",
    title: { en: "Annual Report 2025", ta: "ஆண்டு அறிக்கை 2025" },
    description: {
      en: "A summary of the year's ministry, accounts and activities.",
      ta: "ஆண்டின் ஊழியம், கணக்குகள், நடவடிக்கைகளின் சுருக்கம்.",
    },
    category: "document",
    fileUrl: "/downloads/annual-report-2025.pdf",
    format: "PDF",
    size: "2.4 MB",
    publishedAt: "2026-02-01",
  },
  {
    ...timestamps,
    id: "dl-8",
    slug: "sunday-school-syllabus",
    title: { en: "Sunday School Syllabus", ta: "ஞாயிறு பள்ளி பாடத்திட்டம்" },
    category: "document",
    fileUrl: "/downloads/sunday-school-syllabus.pdf",
    format: "PDF",
    size: "980 KB",
    publishedAt: "2026-03-01",
    fellowshipSlug: "sunday-school",
  },
];
