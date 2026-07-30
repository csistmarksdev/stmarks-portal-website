import type { ChurchEvent } from "@/types/content";

import { placeholderImage } from "./media";

const timestamps = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

/**
 * Dates are fixed ISO strings rather than offsets from `Date.now()` so that
 * prerendered output stays deterministic between server and client.
 */
export const EVENTS: ChurchEvent[] = [
  {
    ...timestamps,
    id: "ev-1",
    slug: "harvest-festival-2026",
    title: { en: "Harvest Festival", ta: "அறுவடைத் திருவிழா" },
    summary: {
      en: "Our annual thanksgiving celebration with worship, offerings and a shared meal.",
      ta: "ஆராதனை, காணிக்கை, பகிர்ந்த உணவுடன் கூடிய எங்கள் ஆண்டு நன்றி கொண்டாட்டம்.",
    },
    description: [
      {
        en: "The harvest festival is the highlight of our church calendar. The sanctuary is decorated with the season's produce, the choir prepares special music, and the whole congregation stays back for lunch together.",
        ta: "அறுவடைத் திருவிழா எங்கள் திருச்சபை நாட்காட்டியின் சிறப்பம்சம். ஆலயம் பருவகால விளைபொருட்களால் அலங்கரிக்கப்படுகிறது, கீர்த்தனைக் குழு சிறப்பு இசையைத் தயாரிக்கிறது, முழு சபையும் ஒன்றாக மதிய உணவுக்குத் தங்குகிறது.",
      },
      {
        en: "Offerings brought on the day support the church's outreach through the year. All are welcome, whether you are a member or visiting for the first time.",
        ta: "அன்று கொண்டுவரப்படும் காணிக்கைகள் ஆண்டு முழுவதும் திருச்சபையின் சேவைப் பணிகளுக்கு உதவுகின்றன. நீங்கள் உறுப்பினராக இருந்தாலும், முதல் முறையாக வருகை தந்தாலும், அனைவரும் வரவேற்கப்படுகிறார்கள்.",
      },
    ],
    startDate: "2026-08-16T06:30:00.000+05:30",
    endDate: "2026-08-16T13:00:00.000+05:30",
    location: { en: "Main Sanctuary", ta: "பிரதான ஆலயம்" },
    image: placeholderImage(30, {
      en: "Harvest festival decorations",
      ta: "அறுவடைத் திருவிழா அலங்காரம்",
    }),
    organiser: { en: "Church Committee", ta: "திருச்சபைக் குழு" },
    featured: true,
  },
  {
    ...timestamps,
    id: "ev-2",
    slug: "youth-retreat-2026",
    title: { en: "Youth Retreat", ta: "இளைஞர் தியான முகாம்" },
    summary: {
      en: "Two days away for worship, teaching and rest, open to all youth members.",
      ta: "ஆராதனை, போதனை, ஓய்வுக்காக இரண்டு நாட்கள் — அனைத்து இளைஞர் உறுப்பினர்களுக்கும் திறந்தது.",
    },
    description: [
      {
        en: "A weekend retreat outside the city with sessions on faith and vocation, small group discussion, games and an evening of worship around the fire.",
        ta: "நகருக்கு வெளியே ஒரு வார இறுதி முகாம் — விசுவாசம் மற்றும் அழைப்பு குறித்த அமர்வுகள், சிறு குழு கலந்துரையாடல், விளையாட்டுகள், நெருப்பைச் சுற்றி மாலை ஆராதனை.",
      },
    ],
    startDate: "2026-09-05T07:00:00.000+05:30",
    endDate: "2026-09-06T18:00:00.000+05:30",
    location: { en: "Mahabalipuram Retreat Centre", ta: "மாமல்லபுரம் தியான மையம்" },
    image: placeholderImage(75, {
      en: "Youth retreat",
      ta: "இளைஞர் தியான முகாம்",
    }),
    fellowshipSlug: "youth-fellowship",
    organiser: { en: "Youth Fellowship", ta: "இளைஞர் ஐக்கியம்" },
    featured: true,
  },
  {
    ...timestamps,
    id: "ev-3",
    slug: "womens-fellowship-day-2026",
    title: { en: "Women's Fellowship Day", ta: "மகளிர் ஐக்கிய தினம்" },
    summary: {
      en: "A day of worship, testimony and fellowship led by the women of the church.",
      ta: "திருச்சபை மகளிரால் வழிநடத்தப்படும் ஆராதனை, சாட்சி, ஐக்கிய நாள்.",
    },
    description: [
      {
        en: "The women's fellowship leads the morning service, followed by a special programme of testimony, song and a shared meal.",
        ta: "மகளிர் ஐக்கியம் காலை ஆராதனையை வழிநடத்துகிறது, தொடர்ந்து சாட்சி, பாடல், பகிர்ந்த உணவுடன் கூடிய சிறப்பு நிகழ்ச்சி.",
      },
    ],
    startDate: "2026-10-11T08:00:00.000+05:30",
    endDate: "2026-10-11T13:00:00.000+05:30",
    location: { en: "Main Sanctuary", ta: "பிரதான ஆலயம்" },
    image: placeholderImage(200, {
      en: "Women's fellowship day",
      ta: "மகளிர் ஐக்கிய தினம்",
    }),
    fellowshipSlug: "womens-fellowship",
    organiser: { en: "Women's Fellowship", ta: "மகளிர் ஐக்கியம்" },
    featured: false,
  },
  {
    ...timestamps,
    id: "ev-4",
    slug: "christmas-carol-service-2026",
    title: { en: "Christmas Carol Service", ta: "கிறிஸ்துமஸ் கீர்த்தனை ஆராதனை" },
    summary: {
      en: "An evening of lessons and carols to welcome the Christmas season.",
      ta: "கிறிஸ்துமஸ் பருவத்தை வரவேற்கும் வேத வாசிப்பு மற்றும் கீர்த்தனை மாலை.",
    },
    description: [
      {
        en: "Nine lessons and carols sung by the choir and congregation, with candles, readings and the children's nativity.",
        ta: "கீர்த்தனைக் குழுவும் சபையும் பாடும் ஒன்பது வேத வாசிப்புகளும் கீர்த்தனைகளும், மெழுகுவர்த்திகள், வாசிப்புகள், குழந்தைகளின் கிறிஸ்து பிறப்பு நாடகத்துடன்.",
      },
    ],
    startDate: "2026-12-20T18:00:00.000+05:30",
    endDate: "2026-12-20T20:00:00.000+05:30",
    location: { en: "Main Sanctuary", ta: "பிரதான ஆலயம்" },
    image: placeholderImage(255, {
      en: "Carol service by candlelight",
      ta: "மெழுகுவர்த்தி வெளிச்சத்தில் கீர்த்தனை ஆராதனை",
    }),
    fellowshipSlug: "choir",
    organiser: { en: "Choir", ta: "கீர்த்தனைக் குழு" },
    featured: true,
  },
  {
    ...timestamps,
    id: "ev-5",
    slug: "easter-sunrise-service-2026",
    title: { en: "Easter Sunrise Service", ta: "உயிர்த்தெழுதல் விடியற்கால ஆராதனை" },
    summary: {
      en: "We gathered before dawn to celebrate the resurrection.",
      ta: "உயிர்த்தெழுதலைக் கொண்டாட விடியலுக்கு முன் கூடினோம்.",
    },
    description: [
      {
        en: "The congregation gathered in the churchyard at first light for a service of resurrection, followed by breakfast together.",
        ta: "சபையினர் விடியற்காலையில் ஆலய முற்றத்தில் உயிர்த்தெழுதல் ஆராதனைக்காகக் கூடினர், தொடர்ந்து ஒன்றாக காலை உணவு.",
      },
    ],
    startDate: "2026-04-05T05:30:00.000+05:30",
    endDate: "2026-04-05T08:00:00.000+05:30",
    location: { en: "Church Grounds", ta: "ஆலய வளாகம்" },
    image: placeholderImage(5, {
      en: "Sunrise over the church",
      ta: "ஆலயத்தின் மேல் சூரிய உதயம்",
    }),
    organiser: { en: "Church Committee", ta: "திருச்சபைக் குழு" },
    featured: false,
  },
  {
    ...timestamps,
    id: "ev-6",
    slug: "sunday-school-annual-day-2026",
    title: { en: "Sunday School Annual Day", ta: "ஞாயிறு பள்ளி ஆண்டு விழா" },
    summary: {
      en: "Our children presented songs, skits and prizes were awarded.",
      ta: "எங்கள் குழந்தைகள் பாடல்கள், நாடகங்கள் வழங்கினர், பரிசுகள் அளிக்கப்பட்டன.",
    },
    description: [
      {
        en: "A joyful afternoon of performances by the Sunday school children, with prizes for attendance, memory verses and craft.",
        ta: "ஞாயிறு பள்ளிக் குழந்தைகளின் நிகழ்ச்சிகளுடன் ஒரு மகிழ்ச்சியான மதியம், வருகை, மனனப் பாடல்கள், கைவினைக்கான பரிசுகளுடன்.",
      },
    ],
    startDate: "2026-03-15T16:00:00.000+05:30",
    endDate: "2026-03-15T19:00:00.000+05:30",
    location: { en: "Parish Hall", ta: "சபை மண்டபம்" },
    image: placeholderImage(105, {
      en: "Sunday school annual day",
      ta: "ஞாயிறு பள்ளி ஆண்டு விழா",
    }),
    fellowshipSlug: "sunday-school",
    organiser: { en: "Sunday School", ta: "ஞாயிறு பள்ளி" },
    featured: false,
  },
];
