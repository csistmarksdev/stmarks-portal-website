import type { Fellowship } from "@/types/content";

import { placeholderImage } from "./media";

const timestamps = {
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const FELLOWSHIPS: Fellowship[] = [
  {
    ...timestamps,
    id: "fs-1",
    slug: "youth-fellowship",
    name: { en: "Youth Fellowship", ta: "இளைஞர் ஐக்கியம்" },
    tagline: {
      en: "Faith, friendship and a bit of noise",
      ta: "விசுவாசம், நட்பு, கொஞ்சம் கலகலப்பு",
    },
    about: [
      {
        en: "Our youth fellowship gathers students and young working adults for worship, discussion and service. Sundays are for singing and studying together; the rest of the month belongs to outreach, sport and the occasional retreat.",
        ta: "எங்கள் இளைஞர் ஐக்கியம் மாணவர்களையும் இளம் பணியாளர்களையும் ஆராதனை, கலந்துரையாடல், சேவைக்காக ஒன்றுசேர்க்கிறது. ஞாயிறுகள் ஒன்றாகப் பாடவும் படிக்கவும்; மாதத்தின் மீதி நாட்கள் சேவை, விளையாட்டு, அவ்வப்போது தியான முகாம்களுக்கு.",
      },
      {
        en: "Whether you have grown up in this church or walked in last week, you will find a seat and a welcome here.",
        ta: "நீங்கள் இந்தத் திருச்சபையில் வளர்ந்தவராக இருந்தாலும், கடந்த வாரம் வந்தவராக இருந்தாலும், இங்கே உங்களுக்கு ஓர் இருக்கையும் வரவேற்பும் கிடைக்கும்.",
      },
    ],
    vision: {
      en: "To raise a generation that knows Christ deeply and serves the world boldly.",
      ta: "கிறிஸ்துவை ஆழமாக அறிந்து, உலகிற்குத் துணிவோடு பணிசெய்யும் ஒரு தலைமுறையை உருவாக்குவது.",
    },
    schedule: { en: "Every Sunday, 5:00 PM", ta: "ஒவ்வொரு ஞாயிறு, மாலை 5:00" },
    memberCount: 64,
    banner: placeholderImage(60, {
      en: "Youth fellowship gathering",
      ta: "இளைஞர் ஐக்கியக் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-1",
        name: { en: "Mr. Aaron Jude", ta: "திரு. ஆரோன் ஜூட்" },
        designation: { en: "President", ta: "தலைவர்" },
      },
      {
        id: "fc-2",
        name: { en: "Ms. Sharon Lydia", ta: "செல்வி. ஷரோன் லிடியா" },
        designation: { en: "Secretary", ta: "செயலாளர்" },
      },
      {
        id: "fc-3",
        name: { en: "Mr. Nathan Praveen", ta: "திரு. நேதன் பிரவீன்" },
        designation: { en: "Treasurer", ta: "பொருளாளர்" },
      },
    ],
    coordinator: {
      name: { en: "Rev. Daniel Raj", ta: "பணி. டேனியல் ராஜ்" },
      email: "youth@csistmarksmadipakkam.org",
    },
    order: 1,
  },
  {
    ...timestamps,
    id: "fs-2",
    slug: "young-couple-fellowship",
    name: { en: "Young Couple Fellowship", ta: "இளம் தம்பதியர் ஐக்கியம்" },
    tagline: {
      en: "Building homes on a firm foundation",
      ta: "உறுதியான அஸ்திபாரத்தில் குடும்பங்களைக் கட்டுதல்",
    },
    about: [
      {
        en: "A space for newly married and young families to grow together — with honest conversation about marriage, parenting and faith, and plenty of shared meals along the way.",
        ta: "புதிதாகத் திருமணமானவர்களும் இளம் குடும்பங்களும் ஒன்றாக வளர ஓர் இடம் — திருமணம், பிள்ளை வளர்ப்பு, விசுவாசம் குறித்த நேர்மையான உரையாடலோடு, பகிர்ந்த உணவுகளோடும்.",
      },
    ],
    vision: {
      en: "To strengthen marriages and homes that reflect the love of Christ.",
      ta: "கிறிஸ்துவின் அன்பைப் பிரதிபலிக்கும் திருமணங்களையும் குடும்பங்களையும் பலப்படுத்துவது.",
    },
    schedule: {
      en: "Second Saturday, 6:00 PM",
      ta: "இரண்டாவது சனிக்கிழமை, மாலை 6:00",
    },
    memberCount: 38,
    banner: placeholderImage(150, {
      en: "Young couples gathering",
      ta: "இளம் தம்பதியர் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-4",
        name: { en: "Mr. & Mrs. Vinoth", ta: "திரு. & திருமதி. வினோத்" },
        designation: { en: "Coordinators", ta: "ஒருங்கிணைப்பாளர்கள்" },
      },
    ],
    coordinator: {
      name: { en: "Mrs. Esther Vimala", ta: "திருமதி. எஸ்தர் விமலா" },
      email: "families@csistmarksmadipakkam.org",
    },
    order: 2,
  },
  {
    ...timestamps,
    id: "fs-3",
    slug: "sunday-school",
    name: { en: "Sunday School", ta: "ஞாயிறு பள்ளி" },
    tagline: {
      en: "Where the story begins",
      ta: "கதை தொடங்கும் இடம்",
    },
    about: [
      {
        en: "Children from ages four to fifteen meet each Sunday morning for Bible stories, songs, craft and games, taught by a team of volunteer teachers.",
        ta: "நான்கு முதல் பதினைந்து வயது வரையிலான குழந்தைகள் ஒவ்வொரு ஞாயிறு காலையும் வேதக் கதைகள், பாடல்கள், கைவினை, விளையாட்டுகளுக்காகக் கூடுகிறார்கள், தன்னார்வ ஆசிரியர் குழுவால் கற்பிக்கப்படுகிறது.",
      },
    ],
    vision: {
      en: "To plant the Word early and joyfully in every child.",
      ta: "ஒவ்வொரு குழந்தையிலும் வசனத்தை ஆரம்பத்திலேயே மகிழ்ச்சியுடன் விதைப்பது.",
    },
    schedule: { en: "Every Sunday, 9:00 AM", ta: "ஒவ்வொரு ஞாயிறு, காலை 9:00" },
    memberCount: 92,
    banner: placeholderImage(90, {
      en: "Sunday school class",
      ta: "ஞாயிறு பள்ளி வகுப்பு",
    }),
    committee: [
      {
        id: "fc-5",
        name: { en: "Mrs. Grace Mary", ta: "திருமதி. கிரேஸ் மேரி" },
        designation: { en: "Superintendent", ta: "கண்காணிப்பாளர்" },
      },
    ],
    coordinator: {
      name: { en: "Mrs. Grace Mary", ta: "திருமதி. கிரேஸ் மேரி" },
      email: "sundayschool@csistmarksmadipakkam.org",
    },
    order: 3,
  },
  {
    ...timestamps,
    id: "fs-4",
    slug: "choir",
    name: { en: "Choir", ta: "கீர்த்தனைக் குழு" },
    tagline: { en: "Make a joyful noise", ta: "ஆனந்த சத்தமிடுங்கள்" },
    about: [
      {
        en: "The choir leads the congregation in worship each Sunday and prepares special music for festivals, weddings and diocesan occasions. New voices are always welcome — no audition required, only commitment to practice.",
        ta: "கீர்த்தனைக் குழு ஒவ்வொரு ஞாயிறும் சபையை ஆராதனையில் வழிநடத்துகிறது, பண்டிகைகள், திருமணங்கள், மறைமாவட்ட நிகழ்வுகளுக்குச் சிறப்பு இசையைத் தயாரிக்கிறது. புதிய குரல்கள் எப்போதும் வரவேற்கப்படுகின்றன — தேர்வு இல்லை, பயிற்சிக்கான அர்ப்பணிப்பு மட்டுமே.",
      },
    ],
    vision: {
      en: "To lead the congregation into the presence of God through music.",
      ta: "இசையின் மூலம் சபையை தேவனுடைய சமூகத்திற்குள் வழிநடத்துவது.",
    },
    schedule: {
      en: "Practice every Saturday, 5:00 PM",
      ta: "ஒவ்வொரு சனிக்கிழமையும் பயிற்சி, மாலை 5:00",
    },
    memberCount: 27,
    banner: placeholderImage(180, {
      en: "Church choir singing",
      ta: "கீர்த்தனைக் குழு பாடுதல்",
    }),
    committee: [
      {
        id: "fc-6",
        name: { en: "Mr. Samuel Raja", ta: "திரு. சாமுவேல் ராஜா" },
        designation: { en: "Choir Master", ta: "கீர்த்தனை ஆசிரியர்" },
      },
    ],
    coordinator: {
      name: { en: "Mr. Samuel Raja", ta: "திரு. சாமுவேல் ராஜா" },
      email: "choir@csistmarksmadipakkam.org",
    },
    order: 4,
  },
  {
    ...timestamps,
    id: "fs-5",
    slug: "womens-fellowship",
    name: { en: "Women's Fellowship", ta: "மகளிர் ஐக்கியம்" },
    tagline: {
      en: "Strength, prayer and sisterhood",
      ta: "பலம், ஜெபம், சகோதரத்துவம்",
    },
    about: [
      {
        en: "The women's fellowship meets for Bible study and prayer, and carries much of the church's outreach — visiting the sick, supporting families in need, and organising the annual harvest festival.",
        ta: "மகளிர் ஐக்கியம் வேதாகம வகுப்பு மற்றும் ஜெபத்திற்காகக் கூடுகிறது, திருச்சபையின் சேவைப் பணிகளில் பெரும்பகுதியைச் சுமக்கிறது — நோயாளிகளைச் சந்தித்தல், தேவையுள்ள குடும்பங்களுக்கு உதவுதல், ஆண்டு அறுவடைத் திருவிழாவை ஒழுங்கமைத்தல்.",
      },
    ],
    vision: {
      en: "To serve the church and community with compassion and quiet strength.",
      ta: "இரக்கத்தோடும் அமைதியான பலத்தோடும் திருச்சபைக்கும் சமூகத்திற்கும் பணிசெய்வது.",
    },
    schedule: {
      en: "Every Thursday, 4:00 PM",
      ta: "ஒவ்வொரு வியாழன், மாலை 4:00",
    },
    memberCount: 85,
    banner: placeholderImage(210, {
      en: "Women's fellowship meeting",
      ta: "மகளிர் ஐக்கியக் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-7",
        name: { en: "Mrs. Ruth Jeyanthi", ta: "திருமதி. ரூத் ஜெயந்தி" },
        designation: { en: "President", ta: "தலைவர்" },
      },
    ],
    coordinator: {
      name: { en: "Mrs. Ruth Jeyanthi", ta: "திருமதி. ரூத் ஜெயந்தி" },
      email: "women@csistmarksmadipakkam.org",
    },
    order: 5,
  },
  {
    ...timestamps,
    id: "fs-6",
    slug: "mens-fellowship",
    name: { en: "Men's Fellowship", ta: "ஆடவர் ஐக்கியம்" },
    tagline: {
      en: "Serving shoulder to shoulder",
      ta: "தோளோடு தோள் நின்று பணிசெய்தல்",
    },
    about: [
      {
        en: "The men's fellowship gathers monthly for study and prayer, and takes responsibility for the upkeep of the church grounds, festival arrangements and community service projects.",
        ta: "ஆடவர் ஐக்கியம் மாதந்தோறும் படிப்பு மற்றும் ஜெபத்திற்காகக் கூடுகிறது, ஆலய வளாகப் பராமரிப்பு, திருவிழா ஏற்பாடுகள், சமூக சேவைத் திட்டங்களுக்குப் பொறுப்பேற்கிறது.",
      },
    ],
    vision: {
      en: "To lead by service, at home and in the church.",
      ta: "வீட்டிலும் திருச்சபையிலும் சேவையால் வழிநடத்துவது.",
    },
    schedule: {
      en: "First Sunday, 4:00 PM",
      ta: "முதல் ஞாயிறு, மாலை 4:00",
    },
    memberCount: 56,
    banner: placeholderImage(240, {
      en: "Men's fellowship gathering",
      ta: "ஆடவர் ஐக்கியக் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-8",
        name: { en: "Mr. Stephen Kumar", ta: "திரு. ஸ்டீபன் குமார்" },
        designation: { en: "President", ta: "தலைவர்" },
      },
    ],
    coordinator: {
      name: { en: "Mr. Stephen Kumar", ta: "திரு. ஸ்டீபன் குமார்" },
      email: "men@csistmarksmadipakkam.org",
    },
    order: 6,
  },
  {
    ...timestamps,
    id: "fs-7",
    slug: "prayer-fellowship",
    name: { en: "Prayer Fellowship", ta: "ஜெப ஐக்கியம்" },
    tagline: {
      en: "Holding one another before God",
      ta: "ஒருவரையொருவர் தேவனுக்கு முன் ஏந்துதல்",
    },
    about: [
      {
        en: "The prayer fellowship meets midweek to intercede for the congregation, the sick, the bereaved and the wider world. Prayer requests can be left with the church office at any time.",
        ta: "ஜெப ஐக்கியம் வாரத்தின் நடுவில் கூடி சபைக்காகவும், நோயாளிகளுக்காகவும், துக்கத்தில் உள்ளவர்களுக்காகவும், பரந்த உலகிற்காகவும் பரிந்து ஜெபிக்கிறது. ஜெப வேண்டுதல்களை எப்போது வேண்டுமானாலும் திருச்சபை அலுவலகத்தில் தெரிவிக்கலாம்.",
      },
    ],
    vision: {
      en: "To be a congregation sustained by constant prayer.",
      ta: "இடைவிடாத ஜெபத்தால் தாங்கப்படும் ஒரு சபையாக இருப்பது.",
    },
    schedule: {
      en: "Every Wednesday, 6:30 PM",
      ta: "ஒவ்வொரு புதன், மாலை 6:30",
    },
    memberCount: 44,
    banner: placeholderImage(270, {
      en: "Prayer meeting",
      ta: "ஜெபக் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-9",
        name: { en: "Mrs. Esther Vimala", ta: "திருமதி. எஸ்தர் விமலா" },
        designation: { en: "Coordinator", ta: "ஒருங்கிணைப்பாளர்" },
      },
    ],
    coordinator: {
      name: { en: "Mrs. Esther Vimala", ta: "திருமதி. எஸ்தர் விமலா" },
      email: "prayer@csistmarksmadipakkam.org",
    },
    order: 7,
  },
  {
    ...timestamps,
    id: "fs-8",
    slug: "other-fellowships",
    name: { en: "Other Fellowships", ta: "பிற ஐக்கியங்கள்" },
    tagline: {
      en: "More ways to belong",
      ta: "இணைவதற்கு மேலும் வழிகள்",
    },
    about: [
      {
        en: "Alongside our main fellowships, smaller groups gather around shared callings — senior members, area prayer cells, the media and sound team, and seasonal mission groups.",
        ta: "எங்கள் முக்கிய ஐக்கியங்களுடன், பகிர்ந்த அழைப்புகளைச் சுற்றி சிறிய குழுக்கள் கூடுகின்றன — மூத்த உறுப்பினர்கள், பகுதி ஜெபக் குழுக்கள், ஊடகம் மற்றும் ஒலி குழு, பருவகால மிஷன் குழுக்கள்.",
      },
      {
        en: "If you would like to start or join one of these, speak with the church office.",
        ta: "இவற்றில் ஒன்றைத் தொடங்கவோ சேரவோ விரும்பினால், திருச்சபை அலுவலகத்தில் பேசுங்கள்.",
      },
    ],
    vision: {
      en: "That every member finds a place to serve and belong.",
      ta: "ஒவ்வொரு உறுப்பினரும் பணிசெய்யவும் இணையவும் ஓர் இடத்தைக் கண்டடைவது.",
    },
    schedule: { en: "Varies by group", ta: "குழுவைப் பொறுத்து மாறுபடும்" },
    banner: placeholderImage(15, {
      en: "Church community gathering",
      ta: "திருச்சபை சமூகக் கூட்டம்",
    }),
    committee: [],
    coordinator: {
      name: { en: "Church Office", ta: "திருச்சபை அலுவலகம்" },
      email: "office@csistmarksmadipakkam.org",
    },
    order: 8,
  },
];
