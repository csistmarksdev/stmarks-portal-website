import type { LocalizedText } from "@/types/common";
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
   * The roll of succession is not part of `LEADERS`: it is a register of terms
   * rather than a list of people, and it is kept as `PRESBYTER_ERAS` below.
   */
];

/* -------------------------------------------------------------------------- */
/* The roll of presbyters                                                     */
/* -------------------------------------------------------------------------- */

/** One presbyter's term, as printed on the church's own roll. */
export interface PresbyterTerm {
  /** Serial number *within its era* — the roll restarts at 1 each time. */
  no: number;
  /**
   * Set in Latin script for both locales.
   *
   * The clergy currently serving carry Tamil forms in `LEADERS` above because
   * the church supplied them. For the sixteen names below it did not, and a
   * transliteration invented here would be this site putting words in a real
   * person's name. They render the same in both locales until the church
   * provides the Tamil; see the note in the page component.
   */
  name: string;
  /** Qualifier shown after the name, e.g. an additional-charge appointment. */
  note?: LocalizedText;
  from: string;
  to: string;
}

/**
 * An era of the roll. The congregation was attached to two other pastorates
 * before it became a unit in its own right, and the roll is numbered afresh
 * under each — so the eras are the structure, not decoration.
 */
export interface PresbyterEra {
  id: string;
  title: LocalizedText;
  terms: PresbyterTerm[];
}

/**
 * The succession of presbyters, exactly as the church keeps it.
 *
 * Hardcoded for the same reason as everything else in this file: it gains one
 * row a year at most, and the history behind that row never changes. Dates are
 * kept as the church writes them — "April 1993", "Aug. 1997" — rather than
 * parsed into `Date`s, because a month and a year is genuinely all that is
 * recorded and turning that into a day would invent precision the register
 * does not have.
 */
export const PRESBYTER_ERAS: PresbyterEra[] = [
  {
    id: "moovarasampet",
    title: {
      en: "With Moovarasampet Pastorate",
      ta: "மூவரசம்பேட்டை பாஸ்டரேட்டுடன்",
    },
    terms: [
      { no: 1, name: "Rev. Sekaran Esakiyel", from: "April 1993", to: "May 1995" },
      { no: 2, name: "Rev. J. John Dhanapal", from: "June 1995", to: "May 1997" },
      { no: 3, name: "Rev. Bakthan Theopphilius", from: "June 1997", to: "July 1997" },
      { no: 4, name: "Rev. T. J. David", from: "Aug. 1997", to: "May 1998" },
      { no: 5, name: "Rev. Earnest Jeya Kumar", from: "June 1998", to: "May 1999" },
    ],
  },
  {
    id: "adambakkam",
    title: {
      en: "With Adambakkam Pastorate",
      ta: "ஆதம்பாக்கம் பாஸ்டரேட்டுடன்",
    },
    terms: [
      { no: 1, name: "Rev. S. P. Paul Prabakaran", from: "June 1999", to: "May 2001" },
      { no: 2, name: "Rev. G. Lawrence Jebadhas", from: "June 2001", to: "Oct. 2001" },
      {
        no: 3,
        name: "Rev. S. Prabakaran Rajasekaran",
        note: { en: "Addl. Charge", ta: "கூடுதல் பொறுப்பு" },
        from: "Oct. 2001",
        to: "May 2002",
      },
      { no: 4, name: "Rev. D. Mohan Raj", from: "June 2002", to: "Mar. 2007" },
    ],
  },
  {
    /* The congregation became a unit in its own right on 1 April 2007. */
    id: "madipakkam-unit",
    title: {
      en: "Madipakkam Unit (01/04/2007)",
      ta: "மடிப்பாக்கம் யூனிட் (01/04/2007)",
    },
    terms: [
      { no: 1, name: "Rev. D. Mohan Raj", from: "April 2007", to: "May 2007" },
      { no: 2, name: "Rev. G. Earnest Selva Durai", from: "June 2007", to: "May 2012" },
      { no: 3, name: "Rev. J. Raja Freeman", from: "June 2012", to: "May 2018" },
      { no: 4, name: "Rev. M. John Christopher", from: "June 2018", to: "May 2023" },
      { no: 5, name: "Rev. D. Paul William", from: "June 2023", to: "May 2024" },
      { no: 6, name: "Rev. D. Y. Dinakaran", from: "June 2024", to: "May 2025" },
      { no: 7, name: "Rev. Y. John Bunyan", from: "June 2025", to: "May 2026" },
    ],
  },
];
