import type { Leader } from "@/types/content";

/**
 * Permanent site content — the people serving the church.
 *
 * Pastors, the committee and the roll of former ministers change on the order
 * of once a year, so they are versioned with the code rather than administered
 * in the Portal: an editor nobody opens is worse than a file a developer edits
 * when the appointment actually happens. There is no `/leadership` endpoint.
 *
 * To update, edit this file and redeploy. See also `src/content/church.ts`.
 *
 * Only details the church has actually supplied appear here. Where a field is
 * unknown — a portrait, an email, a biography, the year someone began serving
 * — it is left off rather than filled with something plausible; every entry on
 * this page names a real person, and the page renders cleanly without them.
 */

const timestamps = {
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2026-07-26T00:00:00.000Z",
};

export const LEADERS: Leader[] = [
  /* ---------------------------------------------------------------- clergy */
  {
    ...timestamps,
    id: "ld-1",
    slug: "pavun-sangeetha",
    name: { en: "Rev. V. Pavun Sangeetha", ta: "பணி. வி. பவுன் சங்கீதா" },
    role: "pastor",
    designation: {
      en: "Chairperson & Presbyter-in-charge",
      ta: "தலைவர் மற்றும் பொறுப்பு போதகர்",
    },
    phone: "+91 99941 88987",
    order: 1,
  },
  {
    ...timestamps,
    id: "ld-2",
    slug: "john-bunyan",
    name: { en: "Rev. Y. John Bunyan", ta: "பணி. ஒய். ஜான் பன்யன்" },
    role: "assistant-pastor",
    designation: { en: "Associate Presbyter", ta: "இணை போதகர்" },
    phone: "+91 89397 69268",
    order: 1,
  },

  /* ------------------------------------------------------- office bearers */
  {
    ...timestamps,
    id: "ld-3",
    slug: "george-v",
    name: { en: "Mr. George V.", ta: "திரு. ஜார்ஜ் வி." },
    role: "committee",
    designation: { en: "Hon. Secretary", ta: "கௌரவச் செயலாளர்" },
    phone: "+91 94440 64537",
    order: 1,
  },
  {
    ...timestamps,
    id: "ld-4",
    slug: "andrews-ruban-j",
    name: { en: "Mr. Andrews Ruban J.", ta: "திரு. ஆண்ட்ரூஸ் ரூபன் ஜெ." },
    role: "committee",
    designation: { en: "Hon. Treasurer", ta: "கௌரவப் பொருளாளர்" },
    phone: "+91 99521 28956",
    order: 2,
  },

  /* ---------------------------------------------------- committee members */
  {
    ...timestamps,
    id: "ld-5",
    slug: "henry-albert-r",
    name: { en: "Mr. Henry Albert R.", ta: "திரு. ஹென்றி ஆல்பர்ட் ஆர்." },
    role: "committee",
    designation: { en: "Committee Member", ta: "குழு உறுப்பினர்" },
    order: 3,
  },
  {
    ...timestamps,
    id: "ld-6",
    slug: "richard-abraham-w",
    name: { en: "Mr. Richard Abraham W.", ta: "திரு. ரிச்சர்ட் ஆபிரகாம் டபிள்யூ." },
    role: "committee",
    designation: { en: "Committee Member", ta: "குழு உறுப்பினர்" },
    order: 4,
  },
  {
    ...timestamps,
    id: "ld-7",
    slug: "robinson-s",
    name: { en: "Mr. Robinson S.", ta: "திரு. ராபின்சன் எஸ்." },
    role: "committee",
    designation: { en: "Committee Member", ta: "குழு உறுப்பினர்" },
    order: 5,
  },
  {
    ...timestamps,
    id: "ld-8",
    slug: "samuel-jesudass-k",
    name: { en: "Mr. Samuel Jesudass K.", ta: "திரு. சாமுவேல் ஜேசுதாஸ் கே." },
    role: "committee",
    designation: { en: "Committee Member", ta: "குழு உறுப்பினர்" },
    order: 6,
  },
  {
    ...timestamps,
    id: "ld-9",
    slug: "keziah-jerom-n",
    name: { en: "Mrs. Keziah Jerom N.", ta: "திருமதி. கெசியா ஜெரோம் என்." },
    role: "committee",
    designation: { en: "Committee Member", ta: "குழு உறுப்பினர்" },
    order: 7,
  },
  {
    ...timestamps,
    id: "ld-10",
    slug: "ranjitha-peter-dg",
    name: { en: "Mrs. Ranjitha Peter D.G.", ta: "திருமதி. ரஞ்சிதா பீட்டர் டி.ஜி." },
    role: "committee",
    designation: { en: "Committee Member", ta: "குழு உறுப்பினர்" },
    order: 8,
  },

  /* ----------------------------------------------------------------- staff */
  {
    ...timestamps,
    id: "ld-11",
    slug: "stephen-raj-c",
    name: { en: "Mr. Stephen Raj C.", ta: "திரு. ஸ்டீபன் ராஜ் சி." },
    role: "staff",
    designation: { en: "Sexton", ta: "திருச்சபை சேவகர்" },
    phone: "+91 88701 89014",
    order: 1,
  },

  /*
   * Former pastors: the roll of succession is not on file. The section renders
   * its empty state until the church supplies the names and tenure years —
   * placeholder clergy would be a false claim about this parish's history.
   */
];
