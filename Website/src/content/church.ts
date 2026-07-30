import type {
  ChurchHistory,
  ChurchProfile,
  DioceseInfo,
  VisionMission,
} from "@/types/content";

import { placeholderImage } from "@/data/media";

/**
 * Permanent site content — the church's own identity.
 *
 * Written once and revised years apart, so it lives in the repository rather
 * than in the Portal CMS: routing it through an admin form would have meant
 * maintaining editors nobody opens. Edit these values here and redeploy.
 *
 * Everything that genuinely changes — service timings, the pastor's message,
 * the weekly verse, and all the listed content (events, blog, gallery,
 * announcements, downloads, leadership, fellowships) — is CMS-managed and
 * reaches the site through `src/services`.
 */

export const CHURCH_PROFILE: ChurchProfile = {
  name: {
    en: "CSI St. Mark's Church, Madipakkam",
    ta: "சி.எஸ்.ஐ. புனித மாற்கு ஆலயம், மடிப்பாக்கம்",
  },
  address: {
    lines: {
      en: "2nd & 3rd Cross Street, Govindasamy Nagar, Madipakkam",
      ta: "2வது & 3வது குறுக்குத் தெரு, கோவிந்தசாமி நகர், மடிப்பாக்கம்",
    },
    city: { en: "Chennai", ta: "சென்னை" },
    state: { en: "Tamil Nadu", ta: "தமிழ்நாடு" },
    postalCode: "600091",
    country: { en: "India", ta: "இந்தியா" },
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=CSI+St+Marks+Church+Madipakkam+Chennai",
    /**
     * Must be a `/maps/embed` URL, not `/maps?…&output=embed`.
     *
     * The `output=embed` form 301-redirects here anyway, but it serves
     * `X-Frame-Options: SAMEORIGIN` on the way — so the browser refuses the
     * frame and the map renders as a blank white panel with no console error
     * that points at the cause. `maps.google.com/maps?output=embed` sends the
     * same header. This is the one variant that omits it.
     *
     * Verified framable; needs no API key.
     */
    embedUrl:
      "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1sCSI+St+Marks+Church+Madipakkam+Chennai",
    latitude: 12.9612,
    longitude: 80.1986,
  },
  phone: ["+91 44 2242 0000"],
  email: ["office@csistmarksmadipakkam.org"],
  officeHours: {
    en: "Monday to Saturday, 9:00 AM – 5:00 PM",
    ta: "திங்கள் முதல் சனி வரை, காலை 9:00 – மாலை 5:00",
  },
  socials: [
    { platform: "facebook", url: "https://facebook.com" },
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "youtube", url: "https://youtube.com" },
  ],
};


export const CHURCH_HISTORY: ChurchHistory = {
  intro: {
    en: "For decades, St. Mark's has been a place of worship, refuge and service for the families of Madipakkam.",
    ta: "பல பத்தாண்டுகளாக, புனித மாற்கு ஆலயம் மடிப்பாக்கம் குடும்பங்களுக்கு ஆராதனை, அடைக்கலம், சேவையின் இடமாக இருந்து வருகிறது.",
  },
  body: [
    {
      en: "What began as a small prayer gathering in a family home has grown into a congregation of hundreds. In its earliest years, believers met wherever space allowed — under thatched roofs, in courtyards, and in borrowed halls — carried by little more than shared conviction and song.",
      ta: "ஒரு குடும்ப வீட்டில் சிறிய ஜெபக் கூட்டமாகத் தொடங்கியது இன்று நூற்றுக்கணக்கானோர் கொண்ட சபையாக வளர்ந்துள்ளது. ஆரம்ப ஆண்டுகளில், விசுவாசிகள் இடம் கிடைத்த எங்கும் கூடினர் — ஓலைக் கூரைகளின் கீழ், முற்றங்களில், இரவல் மண்டபங்களில் — பகிர்ந்த நம்பிக்கையும் பாடலும் மட்டுமே துணையாக.",
    },
    {
      en: "The present sanctuary was raised through the labour and giving of the congregation itself. Families contributed what they could, and the building rose slowly, season by season, until its doors opened to the whole neighbourhood.",
      ta: "தற்போதைய ஆலயம் சபையினரின் உழைப்பாலும் காணிக்கையாலும் எழுப்பப்பட்டது. குடும்பங்கள் தங்களால் இயன்றதைக் கொடுத்தனர், கட்டிடம் பருவம் பருவமாக மெதுவாக உயர்ந்து, இறுதியில் அதன் கதவுகள் முழு அயலாருக்கும் திறக்கப்பட்டன.",
    },
    {
      en: "Today the church continues that inheritance through its weekly worship, through its fellowships and Sunday school, and through quiet service to those in need around it.",
      ta: "இன்று திருச்சபை அந்த மரபை வாராந்திர ஆராதனை மூலமாகவும், ஐக்கியங்கள் மற்றும் ஞாயிறு பள்ளி மூலமாகவும், சுற்றியுள்ள தேவையுள்ளோருக்கு அமைதியான சேவை மூலமாகவும் தொடர்கிறது.",
    },
  ],
  milestones: [
    {
      id: "ms-1",
      year: "1962",
      title: { en: "First gathering", ta: "முதல் கூட்டம்" },
      description: {
        en: "A handful of families begin meeting for prayer in Madipakkam.",
        ta: "மாடிப்பாக்கத்தில் சில குடும்பங்கள் ஜெபத்திற்காகக் கூடத் தொடங்கின.",
      },
    },
    {
      id: "ms-2",
      year: "1974",
      title: { en: "Sanctuary consecrated", ta: "ஆலயம் பிரதிஷ்டை" },
      description: {
        en: "The church building is completed and dedicated to the glory of God.",
        ta: "ஆலயக் கட்டிடம் முடிக்கப்பட்டு தேவனுடைய மகிமைக்காக அர்ப்பணிக்கப்பட்டது.",
      },
    },
    {
      id: "ms-3",
      year: "1988",
      title: { en: "Fellowships formed", ta: "ஐக்கியங்கள் உருவாக்கம்" },
      description: {
        en: "Youth, women's and men's fellowships are established.",
        ta: "இளைஞர், மகளிர், ஆடவர் ஐக்கியங்கள் நிறுவப்பட்டன.",
      },
    },
    {
      id: "ms-4",
      year: "2004",
      title: { en: "Parish hall dedicated", ta: "சபை மண்டபம் அர்ப்பணிப்பு" },
      description: {
        en: "A new parish hall is dedicated, giving the fellowships and Sunday school a home of their own.",
        ta: "புதிய சபை மண்டபம் அர்ப்பணிக்கப்பட்டு, ஐக்கியங்களுக்கும் ஞாயிறு பள்ளிக்கும் சொந்த இடம் கிடைத்தது.",
      },
    },
    {
      id: "ms-5",
      year: "2012",
      title: { en: "Golden Jubilee", ta: "பொன் விழா" },
      description: {
        en: "Fifty years of worship and witness are celebrated together.",
        ta: "ஐம்பது ஆண்டு ஆராதனையும் சாட்சியும் ஒன்றாகக் கொண்டாடப்பட்டன.",
      },
    },
  ],
  image: placeholderImage(40, {
    en: "The church sanctuary",
    ta: "ஆலயத்தின் உட்புறம்",
  }),
};


export const VISION_MISSION: VisionMission = {
  vision: {
    en: "To be a congregation where every person encounters the love of Christ, grows in faith, and is sent out to serve the world around them.",
    ta: "ஒவ்வொரு நபரும் கிறிஸ்துவின் அன்பைச் சந்தித்து, விசுவாசத்தில் வளர்ந்து, தம்மைச் சுற்றியுள்ள உலகிற்குப் பணிசெய்ய அனுப்பப்படும் ஒரு சபையாக இருப்பது.",
  },
  mission: {
    en: "We worship together in spirit and truth, teach the Scriptures faithfully, care for one another in fellowship, and serve our neighbourhood with compassion and justice.",
    ta: "நாங்கள் ஆவியோடும் உண்மையோடும் ஒன்றாக ஆராதிக்கிறோம், வேதத்தை உண்மையாகப் போதிக்கிறோம், ஐக்கியத்தில் ஒருவரையொருவர் கவனிக்கிறோம், இரக்கத்தோடும் நீதியோடும் நம் அயலாருக்குப் பணிசெய்கிறோம்.",
  },
  values: [
    {
      id: "v-1",
      title: { en: "Worship", ta: "ஆராதனை" },
      description: {
        en: "Christ at the centre of everything we gather to do.",
        ta: "நாம் கூடிச் செய்யும் அனைத்தின் மையத்திலும் கிறிஸ்து.",
      },
    },
    {
      id: "v-2",
      title: { en: "Scripture", ta: "வேதவசனம்" },
      description: {
        en: "The Word taught plainly and lived out honestly.",
        ta: "வசனம் தெளிவாகப் போதிக்கப்பட்டு நேர்மையாக வாழப்படுகிறது.",
      },
    },
    {
      id: "v-3",
      title: { en: "Fellowship", ta: "ஐக்கியம்" },
      description: {
        en: "No one walks through joy or sorrow alone.",
        ta: "மகிழ்ச்சியிலோ துக்கத்திலோ யாரும் தனியாக நடப்பதில்லை.",
      },
    },
    {
      id: "v-4",
      title: { en: "Service", ta: "சேவை" },
      description: {
        en: "Faith that shows itself in care for our neighbours.",
        ta: "அயலாரைக் கவனிப்பதில் வெளிப்படும் விசுவாசம்.",
      },
    },
  ],
};


export const DIOCESE_INFO: DioceseInfo = {
  name: {
    en: "CSI Diocese of Madras",
    ta: "சி.எஸ்.ஐ. சென்னை மறைமாவட்டம்",
  },
  /*
   * Figures and dates here are the diocese's own, taken from the public record
   * (the diocese's website was mid-rebuild when this was written). The
   * congregation and pastorate counts will drift over the years — treat them as
   * "about", and check them against the diocese before reprinting anywhere it
   * matters.
   */
  description: [
    {
      en: "St. Mark's belongs to the Diocese of Madras, one of twenty-two dioceses of the Church of South India — the united church formed in 1947 that brought together Anglican, Methodist, Congregational, Presbyterian and Reformed traditions.",
      ta: "புனித மாற்கு ஆலயம், தென்னிந்திய திருச்சபையின் இருபத்திரண்டு மறைமாவட்டங்களில் ஒன்றான சென்னை மறைமாவட்டத்தைச் சேர்ந்தது — ஆங்கிலிக்கன், மெதடிஸ்ட், காங்கிரிகேஷனல், பிரெஸ்பிடீரியன், சீர்திருத்த மரபுகளை ஒன்றிணைத்து 1947 இல் உருவான ஐக்கிய திருச்சபை.",
    },
    {
      en: "The diocese is older than that union. It was constituted on 28 October 1835, when Daniel Corrie was consecrated its first bishop at St George's Church in Madras — the building that became St George's Cathedral, and remains the bishop's seat today.",
      ta: "மறைமாவட்டம் அந்த ஐக்கியத்தை விடப் பழமையானது. 1835 அக்டோபர் 28 அன்று, சென்னையின் புனித ஜார்ஜ் ஆலயத்தில் டேனியல் கோரி அதன் முதல் ஆயராக அபிஷேகம் செய்யப்பட்டபோது இது நிறுவப்பட்டது — அந்தக் கட்டிடமே புனித ஜார்ஜ் பேராலயமாக மாறி, இன்றும் ஆயரின் இருக்கையாக விளங்குகிறது.",
    },
    {
      en: "It now reaches across Chennai and the districts around it, with some 1,192 congregations gathered into 186 pastorates. St. Mark's shares in that wider communion, and in the diocese's long work in education, healthcare and social service.",
      ta: "இன்று இது சென்னையையும் அதைச் சுற்றியுள்ள மாவட்டங்களையும் உள்ளடக்கி, 186 போதகப் பணியிடங்களில் ஏறத்தாழ 1,192 சபைகளைக் கொண்டுள்ளது. புனித மாற்கு ஆலயம் அந்தப் பரந்த ஐக்கியத்திலும், கல்வி, சுகாதாரம், சமூக சேவையில் மறைமாவட்டத்தின் நீண்டகாலப் பணியிலும் பங்கு கொள்கிறது.",
    },
  ],
  bishop: {
    en: "The Rt. Rev. Paul Francis Ravichandran",
    ta: "மேதகு பவுல் பிரான்சிஸ் ரவிச்சந்திரன்",
  },
  websiteUrl: "https://csimadrasdiocese.org",
  /**
   * The diocese's own crest, not a photograph — hence the square dimensions
   * and the `object-contain` treatment on the About page. An emblem cropped to
   * a landscape plate is an emblem defaced.
   */
  image: {
    url: "/diocese.svg",
    alt: {
      en: "Crest of the CSI Diocese of Madras",
      ta: "சி.எஸ்.ஐ. சென்னை மறைமாவட்டத்தின் இலச்சினை",
    },
    width: 200,
    height: 200,
  },
};

