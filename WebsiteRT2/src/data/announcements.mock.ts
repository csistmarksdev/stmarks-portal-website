import type { Announcement } from "@/types/content";

const timestamps = {
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    ...timestamps,
    id: "an-1",
    slug: "harvest-festival-offerings",
    title: {
      en: "Harvest Festival offerings now open",
      ta: "அறுவடைத் திருவிழா காணிக்கை தொடங்கியது",
    },
    body: {
      en: "Families wishing to contribute towards this year's harvest festival may hand their offerings to the church office or any committee member. Contributions support the church's outreach work through the coming year.",
      ta: "இந்த ஆண்டு அறுவடைத் திருவிழாவிற்குப் பங்களிக்க விரும்பும் குடும்பங்கள் தங்கள் காணிக்கைகளை திருச்சபை அலுவலகத்திலோ அல்லது எந்தக் குழு உறுப்பினரிடமோ ஒப்படைக்கலாம். பங்களிப்புகள் வரும் ஆண்டு முழுவதும் திருச்சபையின் சேவைப் பணிகளுக்கு உதவுகின்றன.",
    },
    publishedAt: "2026-07-12",
    pinned: true,
  },
  {
    ...timestamps,
    id: "an-2",
    slug: "youth-retreat-registration",
    title: {
      en: "Youth Retreat registration closes 25 August",
      ta: "இளைஞர் முகாம் பதிவு ஆகஸ்ட் 25 உடன் முடிகிறது",
    },
    body: {
      en: "Registration forms for the September youth retreat are available at the church office and from the fellowship committee. Places are limited, so please register early.",
      ta: "செப்டம்பர் இளைஞர் முகாமிற்கான பதிவு படிவங்கள் திருச்சபை அலுவலகத்திலும் ஐக்கியக் குழுவிடமும் கிடைக்கின்றன. இடங்கள் குறைவு, எனவே விரைவில் பதிவு செய்யுங்கள்.",
    },
    publishedAt: "2026-07-08",
    pinned: false,
    fellowshipSlug: "youth-fellowship",
  },
  {
    ...timestamps,
    id: "an-3",
    slug: "choir-new-members",
    title: {
      en: "Choir welcoming new members",
      ta: "கீர்த்தனைக் குழு புதிய உறுப்பினர்களை வரவேற்கிறது",
    },
    body: {
      en: "The choir is welcoming new voices ahead of the Christmas season. No audition is required - practice is every Saturday at 5:00 PM in the parish hall.",
      ta: "கிறிஸ்துமஸ் பருவத்தை முன்னிட்டு கீர்த்தனைக் குழு புதிய குரல்களை வரவேற்கிறது. தேர்வு தேவையில்லை - ஒவ்வொரு சனிக்கிழமையும் மாலை 5:00 மணிக்கு சபை மண்டபத்தில் பயிற்சி.",
    },
    publishedAt: "2026-07-05",
    pinned: false,
    fellowshipSlug: "choir",
  },
  {
    ...timestamps,
    id: "an-4",
    slug: "office-timing-change",
    title: {
      en: "Church office hours updated",
      ta: "திருச்சபை அலுவலக நேரம் புதுப்பிக்கப்பட்டது",
    },
    body: {
      en: "From this month, the church office will be open Monday to Saturday, 9:00 AM to 5:00 PM. For urgent pastoral needs outside these hours, please call the presbyter directly.",
      ta: "இந்த மாதம் முதல், திருச்சபை அலுவலகம் திங்கள் முதல் சனி வரை காலை 9:00 முதல் மாலை 5:00 வரை திறந்திருக்கும். இந்த நேரத்திற்கு வெளியே அவசர மேய்ப்புத் தேவைகளுக்கு, தயவுசெய்து போதகரை நேரடியாக அழைக்கவும்.",
    },
    publishedAt: "2026-07-01",
    pinned: false,
  },
  {
    ...timestamps,
    id: "an-5",
    slug: "sunday-school-reopening",
    title: {
      en: "Sunday School reopens after the break",
      ta: "விடுமுறைக்குப் பின் ஞாயிறு பள்ளி மீண்டும் தொடங்குகிறது",
    },
    body: {
      en: "Sunday school classes resume from the first Sunday of next month. New children may be enrolled with the superintendent before or after the morning service.",
      ta: "அடுத்த மாதத்தின் முதல் ஞாயிறு முதல் ஞாயிறு பள்ளி வகுப்புகள் மீண்டும் தொடங்கும். புதிய குழந்தைகளை காலை ஆராதனைக்கு முன்போ பின்போ கண்காணிப்பாளரிடம் சேர்க்கலாம்.",
    },
    publishedAt: "2026-06-24",
    pinned: false,
    fellowshipSlug: "sunday-school",
  },
];
