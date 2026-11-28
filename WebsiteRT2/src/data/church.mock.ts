import type {
  PastorMessage,
  ServiceTiming,
  WeeklyVerse,
} from "@/types/content";

/**
 * Placeholder data for the church content the **Portal CMS** owns. Replaced by
 * live API responses once `NEXT_PUBLIC_API_URL` is set - see `src/services`.
 *
 * The church profile, history, vision & mission and diocese details are not
 * here: they are permanent site content and live in `src/content/church.ts`.
 */

/*
 * The church's published order of services, carried over from the Church
 * Timings page of the previous website (csistmarks.com/church-timings).
 *
 * The old site named no rooms, so every venue is simply the church.
 * TODO(church-office): reconfirm these against the current notice board; the
 * old page was last revised in 2024.
 */
const CHURCH = { en: "Church", ta: "ஆலயம்" };

export const SERVICE_TIMINGS: ServiceTiming[] = [
  {
    id: "st-1",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "8:15 AM", ta: "காலை 8:15" },
    startTime: "08:15",
    endTime: "08:30",
    service: {
      en: "Praise and Worship, led by the youth",
      ta: "துதி ஆராதனை (வாலிபர் ஐக்கியம்)",
    },
    venue: CHURCH,
  },
  {
    id: "st-2",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "8:30 AM", ta: "காலை 8:30" },
    startTime: "08:30",
    featured: true,
    weeks: [2, 4],
    service: { en: "Holy Communion", ta: "திருவிருந்து ஆராதனை" },
    venue: CHURCH,
  },
  {
    id: "st-3",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "8:30 AM", ta: "காலை 8:30" },
    startTime: "08:30",
    featured: true,
    weeks: [1, 3, 5],
    service: { en: "Matins (Morning Worship)", ta: "காலை ஆராதனை" },
    venue: CHURCH,
  },
  {
    id: "st-4",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "9:00 AM", ta: "காலை 9:00" },
    startTime: "09:00",
    service: { en: "Sunday School", ta: "ஞாயிறு பள்ளி" },
    venue: CHURCH,
  },
  {
    id: "st-5",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "6:00 PM", ta: "மாலை 6:00" },
    startTime: "18:00",
    service: { en: "Evening Service", ta: "மாலை ஆராதனை" },
    venue: CHURCH,
  },
  {
    // Not a weekday, so it never lights the "live now" strip - see isLiveNow.
    id: "st-6",
    day: { en: "1st of every month", ta: "ஒவ்வொரு மாதமும் 1-ஆம் தேதி" },
    time: { en: "7:00 PM", ta: "மாலை 7:00" },
    startTime: "19:00",
    service: {
      en: "Holy Communion (first day of the month)",
      ta: "மாதத்தின் முதல் நாள் திருவிருந்து",
    },
    venue: CHURCH,
  },
  {
    id: "st-7",
    day: { en: "Wednesday", ta: "புதன்" },
    time: { en: "7:00 PM", ta: "மாலை 7:00" },
    startTime: "19:00",
    service: { en: "Campus Prayer", ta: "வளாக ஜெபம்" },
    venue: CHURCH,
  },
  {
    id: "st-8",
    day: { en: "Saturday", ta: "சனி" },
    time: { en: "10:00 AM", ta: "காலை 10:00" },
    startTime: "10:00",
    weeks: [2],
    service: { en: "Monthly Fasting Prayer", ta: "மாதாந்திர உபவாச ஜெபம்" },
    venue: CHURCH,
  },
  {
    id: "st-9",
    day: { en: "Saturday", ta: "சனி" },
    time: { en: "7:00 PM", ta: "மாலை 7:00" },
    startTime: "19:00",
    service: { en: "Choir Practice", ta: "பாடகர் குழு பயிற்சி" },
    venue: CHURCH,
  },
];


export const PASTOR_MESSAGE: PastorMessage = {
  // Kept in step with `src/content/leadership.ts`, where this appointment is
  // the canonical record. The byline carries the pastoral office rather than
  // the full "Chairperson &" title, which is administrative.
  authorName: { en: "Rev. V. Pavun Sangeetha", ta: "பணி. வி. பவுன் சங்கீதா" },
  authorRole: { en: "Presbyter-in-charge", ta: "பொறுப்பு போதகர்" },
  excerpt: {
    en: "Whoever you are, and whatever you carry with you today, there is room for you at this table.",
    ta: "நீங்கள் யாராக இருந்தாலும், இன்று எதைச் சுமந்து வந்தாலும், இந்தப் பந்தியில் உங்களுக்கு இடம் உண்டு.",
  },
  body: [
    {
      en: "Dear friends, a church is not a building of stone and mortar but a people gathered by grace. Every week I watch this congregation live that out - in the hands raised in worship, in meals shared after service, in quiet prayers whispered for one another.",
      ta: "அன்பு நண்பர்களே, திருச்சபை என்பது கல்லும் சுண்ணாம்பும் கொண்ட கட்டிடம் அல்ல, கிருபையால் ஒன்றுசேர்க்கப்பட்ட மக்கள். ஒவ்வொரு வாரமும் இந்தச் சபை அதை வாழ்ந்து காட்டுவதை நான் காண்கிறேன் - ஆராதனையில் உயர்த்தப்படும் கரங்களில், ஆராதனைக்குப் பின் பகிரப்படும் உணவில், ஒருவருக்காக ஒருவர் மெல்லிய குரலில் செய்யும் ஜெபங்களில்.",
    },
    {
      en: "If you are searching, grieving, celebrating or simply curious, I invite you to come and sit with us. You will not be asked to be anyone other than yourself.",
      ta: "நீங்கள் தேடுபவராக, துக்கப்படுபவராக, கொண்டாடுபவராக, அல்லது வெறுமனே ஆர்வமுள்ளவராக இருந்தால், வந்து எங்களுடன் அமருமாறு அழைக்கிறேன். நீங்கள் நீங்களாக இல்லாமல் வேறு யாராகவும் இருக்கும்படி கேட்கப்பட மாட்டீர்கள்.",
    },
  ],
};


// The verse the previous website's home page carried.
export const WEEKLY_VERSE: WeeklyVerse = {
  reference: { en: "Isaiah 65:24", ta: "ஏசாயா 65:24" },
  text: {
    en: "Before they call, I will answer.",
    ta: "அவர்கள் கூப்பிடுகிறதற்கு முன்னே நான் மறுஉத்தரவு கொடுப்பேன்.",
  },
  weekOf: "2026-11-29",
};
