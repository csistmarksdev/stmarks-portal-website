import type {
  ChurchHistory,
  ChurchProfile,
  DioceseInfo,
  VisionMission,
} from "@/types/content";

import { CHURCH_OFFICE } from "./church-office";

/**
 * Permanent site content - the church's own identity.
 *
 * Written once and revised years apart, so it lives in the repository rather
 * than in the Portal CMS: routing it through an admin form would have meant
 * maintaining editors nobody opens. Edit these values here and redeploy.
 *
 * Everything that genuinely changes - service timings, the pastor's message,
 * the weekly verse, and all the listed content (events, blog, gallery,
 * announcements, downloads, leadership, fellowships) - is CMS-managed and
 * reaches the site through `src/services`.
 */

export const CHURCH_PROFILE: ChurchProfile = {
  name: {
    en: "CSI St. Mark's Church, Madipakkam",
    ta: "சி.எஸ்.ஐ. தூய மாற்கு ஆலயம், மடிப்பாக்கம்",
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
     * `X-Frame-Options: SAMEORIGIN` on the way - so the browser refuses the
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
  // F-007: placeholder phone and dead-domain email removed; the real ones are
  // TODO(church-office) in ./church-office.ts.
  phone: [...CHURCH_OFFICE.officePhones],
  email: [...CHURCH_OFFICE.officeEmails],
  officeHours: CHURCH_OFFICE.officeHours,
  socials: [
    { platform: "facebook", url: "https://www.facebook.com/csistmarks/" },
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "youtube", url: "https://www.youtube.com/@csistmarkschurch" },
  ],
};


export const CHURCH_HISTORY: ChurchHistory = {
  intro: {
    en: "From a humble gathering of six pioneer families in a thatched terrace shed in 1993 to a vibrant sanctuary of over 190 families, the journey of CSI St. Mark's Church, Madipakkam is a testimony of God's grace and guidance.",
    ta: "1993-இல் ஒரு மொட்டை மாடி ஓலைக் கொட்டகையில் 6 குடும்பங்களின் ஆராதனையுடன் தொடங்கி, இன்று 190-க்கும் மேற்பட்ட குடும்பங்கள் கொண்ட சபையாக வளர்ந்துள்ள சி.எஸ்.ஐ. தூய மாற்கு ஆலயம், தேவனின் கிருபைக்கு சாட்சியாகும்.",
  },
  body: [
    {
      // Background from the previous website's Church History page: the new
      // congregations were planted so that Moovarasampet could reach the
      // strength the diocese required of a pastorate.
      en: "In early 1993, when the church at Moovarasampet was seeking pastorate status, the Rt. Rev. Dr. M. Azariah, Bishop in Madras, advised it to plant new congregations in nearby Madipakkam and Keelkattalai. Six families in Madipakkam came forward, and began meeting for worship in a thatched shed on the terrace of Mr. Paulkanthan's home. On St. Mark's Day, 25 April 1993, the first Holy Communion service was held and the congregation was named St. Mark's Church.",
      ta: "1993-இன் தொடக்கத்தில், மூவரசம்பேட்டை ஆலயம் சேகரத் தகுதி பெற முயன்றபோது, அருகிலுள்ள மடிப்பாக்கத்திலும் கீழ்க்கட்டளையிலும் புதிய சபைகளைத் தொடங்குமாறு சென்னைப் பேராயர் பேரருள்திரு. முனைவர் எம். அசரியா அவர்கள் ஆலோசனை வழங்கினார். மடிப்பாக்கத்தைச் சேர்ந்த ஆறு குடும்பங்கள் முன்வந்து, திரு. பால்காந்தன் அவர்களின் வீட்டு மொட்டை மாடியில் அமைந்த ஓலைக் கொட்டகையில் ஆராதிக்கக் கூடினர். 1993 ஏப்ரல் 25 அன்று (தூய மாற்கு திருநாள்) முதல் திருவிருந்து ஆராதனை நடைபெற்று, சபைக்கு 'தூய மாற்கு ஆலயம்' எனப் பெயரிடப்பட்டது.",
    },
    {
      en: "As the congregation grew, 5.5 grounds of land were acquired on 9 April 1995, and a new sanctuary was dedicated on 8 February 1997. The first Confirmation Service in the church was held on 19 September 2006 by the Rt. Rev. Dr. V. Devasahayam, when sixteen members were confirmed. A further 1.5 grounds of adjacent land were bought on 25 January 2007, and through the efforts of Rev. D. Mohan Raj the church was awarded Unit status from 1 April 2007. In 2012 Rev. J. Raja Freeman took charge and expanded the fellowships.",
      ta: "சபை பெருகியதால் 1995 ஏப்ரல் 9 அன்று 5.5 கிரவுண்ட் நிலம் வாங்கப்பட்டது; 1997 பிப்ரவரி 8 அன்று புதிய ஆலயம் பிரதிஷ்டை செய்யப்பட்டது. 2006 செப்டம்பர் 19 அன்று பேரருள்திரு. முனைவர் வி. தேவசகாயம் அவர்களால் ஆலயத்தின் முதல் திடப்படுத்தல் ஆராதனை நடைபெற்று, பதினாறு உறுப்பினர்கள் திடப்படுத்தப்பட்டனர். 2007 ஜனவரி 25 அன்று அருகிலுள்ள 1.5 கிரவுண்ட் நிலம் கூடுதலாக வாங்கப்பட்டது; அருள்திரு. டி. மோகன் ராஜ் அவர்களின் முயற்சியால் 2007 ஏப்ரல் 1 முதல் இச்சபை யூனிட் தகுதி பெற்றது. 2012-இல் அருள்திரு. ஜெ. ராஜா ஃப்ரீமேன் பொறுப்பேற்று ஐக்கியங்களை விரிவுபடுத்தினார்.",
    },
    {
      en: "Today, CSI St. Mark's Church embraces over 190 families across active fellowships, choirs, and community outreach - free medical camps, and regular visits to and support for orphanages and homes. The congregation worships in its completed 'Stilt Plus' sanctuary with covered car parking, a dedicated Sunday School complex, and a majestic Bell Tower.",
      ta: "இன்று 190-க்கும் மேற்பட்ட குடும்பங்களுடன் ஐக்கியங்கள், பாடகர் குழுக்கள், சமூக சேவைகள் - இலவச மருத்துவ முகாம்கள், ஆதரவற்றோர் இல்லங்களையும் காப்பகங்களையும் தொடர்ந்து சந்தித்து உதவுதல் - ஆகியவற்றுடன் இயங்கும் திருச்சபை, தரைத்தளத்தில் விசாலமான வாகன நிறுத்துமிடம், பிரத்யேக ஞாயிறு பள்ளி வளாகம், கம்பீரமான மணி கோபுரம் ஆகியவற்றுடன் கூடிய புதிய ஆலயத்தில் (ஸ்டில்ட் + மேல்தளங்கள்) ஆராதித்து வருகிறது.",
    },
  ],
  milestones: [
    {
      id: "ms-1",
      year: "1993",
      title: { en: "First Service & Naming", ta: "முதல் ஆராதனை & பெயர் சூட்டல்" },
      description: {
        en: "Six pioneer families gather on a terrace shed; named St. Mark's Church on April 25th.",
        ta: "மொட்டை மாடி கொட்டகையில் 6 குடும்பங்கள் கூடினர்; ஏப்ரல் 25 அன்று தூய மாற்கு ஆலயம் என பெயரிடப்பட்டது.",
      },
    },
    {
      id: "ms-2",
      year: "1995–1997",
      title: { en: "Land & Sanctuary Dedicated", ta: "நிலம் & ஆலயம் அர்ப்பணிப்பு" },
      description: {
        en: "Purchased 5.5 grounds of land; new sanctuary dedicated on Feb 8, 1997 by the Rt. Rev. Dr. M. Azariah, Bishop in Madras.",
        ta: "5.5 கிரவுண்ட் நிலம் வாங்கப்பட்டு 1997 பிப்ரவரி 8 அன்று சென்னைப் பேராயர் பேரருள்திரு. முனைவர் எம். அசரியா அவர்களால் ஆலயம் பிரதிஷ்டை செய்யப்பட்டது.",
      },
    },
    {
      id: "ms-2b",
      year: "2006",
      title: { en: "First Confirmation Service", ta: "முதல் திடப்படுத்தல் ஆராதனை" },
      description: {
        en: "Sixteen members confirmed on 19 September 2006 by the Rt. Rev. Dr. V. Devasahayam.",
        ta: "2006 செப்டம்பர் 19 அன்று பேரருள்திரு. முனைவர் வி. தேவசகாயம் அவர்களால் பதினாறு உறுப்பினர்கள் திடப்படுத்தப்பட்டனர்.",
      },
    },
    {
      id: "ms-3",
      year: "2007",
      title: { en: "Independent Unit Status", ta: "சுயாதீன யூனிட் தகுதி" },
      description: {
        en: "Awarded independent Unit Status under Rev. D. Mohan Raj; adjacent 1.5 grounds acquired.",
        ta: "அருள்திரு. டி. மோகன் ராஜ் அவர்களின் காலத்தில் யூனிட் தகுதி பெற்றது; 1.5 கிரவுண்ட் நிலம் கூடுதலாக வாங்கப்பட்டது.",
      },
    },
    {
      id: "ms-4",
      year: "2012",
      title: { en: "Rev. J. Raja Freeman Takes Charge", ta: "அருள்திரு. ஜெ. ராஜா ஃப்ரீமேன் பொறுப்பேற்பு" },
      description: {
        en: "Rev. J. Raja Freeman takes charge, expanding fellowship ministries and outreach.",
        ta: "அருள்திரு. ஜெ. ராஜா ஃப்ரீமேன் பொறுப்பேற்று ஐக்கியங்களையும் சமூகப் பணிகளையும் விரிவுபடுத்தினார்.",
      },
    },
    {
      // From the foundation-stone plaque in the previous website's 2023 album.
      id: "ms-4b",
      year: "2022",
      title: {
        en: "Sunday School Building Foundation Stone",
        ta: "ஞாயிறு பள்ளிக் கட்டட அடிக்கல்",
      },
      description: {
        en: "On the 29th church anniversary, 25 April 2022, the Rt. Rev. Dr. J. George Stephen, Bishop in Madras, laid the foundation stone of the Sunday School building.",
        ta: "29-ஆம் ஆலய ஆண்டு விழாவான 2022 ஏப்ரல் 25 அன்று, சென்னைப் பேராயர் பேரருள்திரு. முனைவர் ஜெ. ஜார்ஜ் ஸ்டீபன் அவர்கள் ஞாயிறு பள்ளிக் கட்டடத்திற்கு அடிக்கல் நாட்டினார்.",
      },
    },
    {
      id: "ms-5",
      year: { en: "Present", ta: "இன்று" },
      title: { en: "Stilt-Plus Sanctuary, Bell Tower & Sunday School", ta: "புதிய ஆலயம், மணி கோபுரம் & ஞாயிறு பள்ளி" },
      description: {
        en: "Growing to 190+ families with a completed Stilt-Plus sanctuary, covered parking, Sunday School complex, and Bell Tower.",
        // F-058: Tamil wording rather than "ஸ்டில்ட் பிளஸ்" / "பார்க்கிங்".
        ta: "190+ குடும்பங்கள்; தரைத்தளத்தில் விசாலமான வாகன நிறுத்துமிடத்துடன் கூடிய புதிய ஆலயம் (ஸ்டில்ட் + மேல்தளங்கள்), ஞாயிறு பள்ளி வளாகம், மணி கோபுரம்.",
      },
    },
  ],
  // The sanctuary of the new church, from the previous website's 2023 album.
  image: {
    url: "/images/church-sanctuary-altar.jpg",
    alt: {
      en: "The altar and stained-glass windows of the sanctuary, CSI St. Mark's Church, Madipakkam",
      ta: "சி.எஸ்.ஐ. தூய மாற்கு ஆலயத்தின் பலிபீடமும் வண்ணக் கண்ணாடி சாளரங்களும், மடிப்பாக்கம்",
    },
    width: 1024,
    height: 768,
  },
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
    // F-047: CSI usage - பேராயம் (diocese), not the Catholic மறைமாவட்டம்.
    ta: "சி.எஸ்.ஐ. சென்னைப் பேராயம்",
  },
  /*
   * Figures and dates here are the diocese's own, taken from the public record
   * (the diocese's website was mid-rebuild when this was written). The
   * congregation and pastorate counts will drift over the years - treat them as
   * "about", and check them against the diocese before reprinting anywhere it
   * matters.
   */
  description: [
    {
      en: "St. Mark's belongs to the Diocese of Madras of the Church of South India, the united church formed in 1947 from the Anglican, Methodist, Congregational, Presbyterian and Reformed traditions.",
      ta: "தூய மாற்கு ஆலயம், தென்னிந்தியத் திருச்சபையின் சென்னைப் பேராயத்தைச் சேர்ந்தது. ஆங்கிலிக்கன், மெதடிஸ்ட், சபைக்கூட்டு (காங்கிரிகேஷனல்), பிரெஸ்பிடேரியன், சீர்திருத்த மரபுகள் ஒன்றிணைந்து 1947-இல் உருவான ஐக்கியத் திருச்சபை இது.",
    },
    {
      en: "The diocese is older than that union. It was constituted on 28 October 1835, when Daniel Corrie, consecrated at Lambeth that June, was installed as its first bishop at St George's Church in Madras, the building that became St George's Cathedral, and remains the bishop's seat today.",
      ta: "பேராயம் அந்த ஐக்கியத்தை விடப் பழமையானது. 1835 அக்டோபர் 28 அன்று, சென்னையின் புனித ஜார்ஜ் ஆலயத்தில் டேனியல் கோரி அதன் முதல் பேராயராகப் பொறுப்பேற்றபோது இது நிறுவப்பட்டது. அந்தக் கட்டிடமே புனித ஜார்ஜ் பேராலயமாக மாறி, இன்றும் பேராயரின் இருக்கையாக விளங்குகிறது.",
    },
    {
      en: "It now reaches across Chennai and the districts around it, with some 1,192 congregations gathered into 186 pastorates. St. Mark's shares in that wider communion, and in the diocese's long work in education, healthcare and social service.",
      ta: "இன்று இது சென்னையையும் அதைச் சுற்றியுள்ள மாவட்டங்களையும் உள்ளடக்கி, 186 சேகரங்களில் ஏறத்தாழ 1,192 சபைகளைக் கொண்டுள்ளது. தூய மாற்கு ஆலயம் அந்தப் பரந்த ஐக்கியத்திலும், கல்வி, சுகாதாரம், சமூக சேவையில் பேராயத்தின் நீண்டகாலப் பணியிலும் பங்கு கொள்கிறது.",
    },
  ],
  bishop: {
    en: "The Rt. Rev. Paul Francis Ravichandran",
    // TODO(church-office): confirm the bishop's initial before adding it (F-047).
    ta: "பேரருள்திரு. பவுல் பிரான்சிஸ் ரவிச்சந்திரன்",
  },
  // F-055: csimadrasdiocese.org is a holding page; this is the diocese's live site.
  websiteUrl: "https://www.csidioceseofmadras.com/",
  /**
   * The CSI emblem (F-024: not the diocese's crest), not a photograph - hence the square dimensions
   * and the `object-contain` treatment on the About page. An emblem cropped to
   * a landscape plate is an emblem defaced.
   */
  image: {
    url: "/diocese.svg",
    alt: {
      // F-024: this file is the CSI Synod emblem, not the diocese's crest.
      // TODO(church-office): the official Diocese of Madras crest, with permission.
      en: "Emblem of the Church of South India",
      ta: "தென்னிந்திய திருச்சபையின் இலச்சினை",
    },
    width: 200,
    height: 200,
  },
};

