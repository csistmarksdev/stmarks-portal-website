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

export const SERVICE_TIMINGS: ServiceTiming[] = [
  {
    id: "st-1",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "6:00 AM", ta: "காலை 6:00" },
    service: { en: "Holy Communion", ta: "திருவிருந்து ஆராதனை" },
    venue: { en: "Main Sanctuary", ta: "பிரதான ஆலயம்" },
  },
  {
    id: "st-2",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "8:00 AM", ta: "காலை 8:00" },
    service: { en: "Morning Worship", ta: "காலை ஆராதனை" },
    venue: { en: "Main Sanctuary", ta: "பிரதான ஆலயம்" },
  },
  {
    id: "st-4",
    day: { en: "Sunday", ta: "ஞாயிறு" },
    time: { en: "9:00 AM", ta: "காலை 9:00" },
    service: { en: "Sunday School", ta: "ஞாயிறு பள்ளி" },
    venue: { en: "Parish Hall", ta: "சபை மண்டபம்" },
  },
  {
    id: "st-5",
    day: { en: "Wednesday", ta: "புதன்" },
    time: { en: "6:30 PM", ta: "மாலை 6:30" },
    service: { en: "Prayer Meeting", ta: "ஜெபக் கூட்டம்" },
    venue: { en: "Prayer Hall", ta: "ஜெப மண்டபம்" },
  },
  {
    id: "st-6",
    day: { en: "Friday", ta: "வெள்ளி" },
    time: { en: "6:30 PM", ta: "மாலை 6:30" },
    service: { en: "Bible Study", ta: "வேதாகம வகுப்பு" },
    venue: { en: "Parish Hall", ta: "சபை மண்டபம்" },
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


export const WEEKLY_VERSE: WeeklyVerse = {
  reference: { en: "Psalm 23:1", ta: "சங்கீதம் 23:1" },
  text: {
    en: "The Lord is my shepherd; I shall not want.",
    ta: "கர்த்தர் என் மேய்ப்பராயிருக்கிறார்; நான் தாழ்ச்சியடையேன்.",
  },
  weekOf: "2026-07-19",
};
