import type { Fellowship } from "@/types/content";

import { placeholderImage } from "./media";

/**
 * The fellowships, as the church itself described them.
 *
 * Text, schedules, member counts and office bearers are carried over from the
 * fellowship pages of the previous website (csistmarks.com - Sunday School,
 * Youth, Women's, Men's, Young Couple and Choir), lightly edited for spelling
 * and translated into Tamil. Scripture in Tamil follows the BSI Tamil Bible.
 *
 * Two things the old site could not supply:
 *  - Office bearers change on election, and the old pages were last revised
 *    around 2024. TODO(church-office): reconfirm every committee below.
 *    Names are kept in Latin script in both locales, as the presbyter roll in
 *    src/content/leadership.ts does - a Tamil spelling invented here would put
 *    words in a real person's name.
 *  - A contact for joining. The old pages only said "please contact us", so
 *    every coordinator is the church office, with no email: the previous
 *    addresses used an unregistered domain (F-007).
 *
 * Banners remain placeholders until the church supplies photographs.
 */

const timestamps = {
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2026-11-28T00:00:00.000Z",
};

const CHURCH_OFFICE_CONTACT = {
  name: { en: "Church Office", ta: "ஆலய அலுவலகம்" },
};

/** A person's name, identical in both locales - see the note above. */
function person(name: string) {
  return { en: name, ta: name };
}

export const FELLOWSHIPS: Fellowship[] = [
  {
    ...timestamps,
    id: "fs-1",
    slug: "youth-fellowship",
    name: { en: "Youth Fellowship", ta: "வாலிபர் ஐக்கியம்" },
    tagline: {
      en: "“Built together into a dwelling for God” - Ephesians 2:22",
      ta: "“தேவனுடைய வாசஸ்தலமாகக் கூட்டிக் கட்டப்பட்டு” - எபேசியர் 2:22",
    },
    about: [
      {
        en: "Our Youth Fellowship has about 25 active members who meet every Sunday after the service. Each meeting opens with a short time of praise and worship, followed by testimonies and the sharing of God's word - time we use to discover God-given talents and develop them to build the Kingdom of God.",
        ta: "எங்கள் வாலிபர் ஐக்கியத்தில் சுமார் 25 உறுப்பினர்கள் தீவிரமாகப் பங்கேற்கின்றனர்; ஒவ்வொரு ஞாயிறும் ஆராதனைக்குப் பின் கூடுகின்றனர். ஒவ்வொரு கூட்டமும் சிறிய துதி ஆராதனையுடன் தொடங்கி, சாட்சிகளும் தேவ வசனப் பகிர்வும் தொடர்கின்றன. தேவன் அருளிய தாலந்துகளைக் கண்டறிந்து, தேவனுடைய ராஜ்யத்தைக் கட்டியெழுப்ப அவற்றை வளர்த்துக்கொள்ள இந்த நேரம் பயன்படுகிறது.",
      },
      {
        en: "Our youth love to worship through song - “It is good to praise the Lord and make music to your name, O Most High” (Psalm 92:1). They lead the Praise and Worship at 8:15 AM every Sunday before the morning service, and on the fourth Sunday of each month they conduct the evening service themselves, including the sharing of the message.",
        ta: "எங்கள் வாலிபர்கள் பாடல்கள் வழியாக ஆராதிப்பதை விரும்புகின்றனர் - “கர்த்தரைத் துதிப்பதும், உன்னதமானவரே, உமது நாமத்தைக் கீர்த்தனம் பண்ணுவதும் நலமாயிருக்கும்” (சங்கீதம் 92:1). ஒவ்வொரு ஞாயிறும் காலை ஆராதனைக்கு முன் காலை 8:15 மணிக்குத் துதி ஆராதனையை வழிநடத்துகின்றனர்; ஒவ்வொரு மாதமும் நான்காம் ஞாயிறு மாலை ஆராதனையை, செய்தி உட்பட, அவர்களே நடத்துகின்றனர்.",
      },
      {
        en: "The youth decorate the church for the festive seasons, run stalls at the Mission Festival and Harvest Festival to raise funds for the Diocese's missions, and take an active part in the church's outreach. A youth retreat is held once a year. You are warmly invited to be part of our youth team.",
        ta: "பண்டிகைக் காலங்களில் ஆலயத்தை அலங்கரிப்பதும், பேராயத்தின் மிஷன் பணிகளுக்கு நிதி திரட்ட மிஷன் பண்டிகை மற்றும் அறுப்பின் பண்டிகையில் கடைகள் அமைப்பதும், ஆலயத்தின் சமூகப் பணிகளில் தீவிரமாகப் பங்கேற்பதும் வாலிபர்களே. ஆண்டுக்கு ஒருமுறை வாலிபர் தியான முகாம் நடைபெறுகிறது. எங்கள் வாலிபர் குழுவில் இணைய உங்களை அன்புடன் அழைக்கிறோம்.",
      },
    ],
    vision: {
      en: "To bring the youth of the church into a relationship with Jesus, connect them to God's family, mature them in their faith, and equip them for ministry, so that God's name will be exalted.",
      ta: "ஆலயத்தின் வாலிபர்களை இயேசுவுடனான உறவுக்குள் கொண்டுவந்து, தேவனுடைய குடும்பத்தோடு இணைத்து, விசுவாசத்தில் முதிர்ச்சியடையச் செய்து, ஊழியத்திற்குத் தகுதிப்படுத்தி, தேவனுடைய நாமம் உயர்த்தப்படச் செய்வது.",
    },
    schedule: {
      en: "Every Sunday, after the morning service",
      ta: "ஒவ்வொரு ஞாயிறும், காலை ஆராதனைக்குப் பின்",
    },
    memberCount: 25,
    banner: placeholderImage(60, {
      en: "Youth fellowship gathering",
      ta: "வாலிபர் ஐக்கியக் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-1",
        name: person("Mr. Richard Abraham W."),
        designation: { en: "Youth Coordinator", ta: "வாலிபர் ஒருங்கிணைப்பாளர்" },
      },
      {
        id: "fc-2",
        name: person("Mr. Andrews Stanley"),
        designation: { en: "Secretary", ta: "செயலாளர்" },
      },
    ],
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 1,
  },
  {
    ...timestamps,
    id: "fs-2",
    slug: "young-couple-fellowship",
    name: { en: "Young Couple Fellowship", ta: "இளம் தம்பதியர் ஐக்கியம்" },
    tagline: {
      en: "Like Aquila and Priscilla, serving the Lord together",
      ta: "ஆக்கில்லா, பிரிஸ்கில்லாளைப் போல இணைந்து கர்த்தருக்குப் பணிசெய்தல்",
    },
    about: [
      {
        en: "The Young Couple Fellowship is a well-organised team of young couples who meet every Sunday morning after the service to sing praises to God, share testimonies, meditate on the Word of God and pray for one another's families. Every young couple in the church is encouraged to join: this time together builds a refreshing bond with God and with other couples. The fellowship actively supports all the activities of the church.",
        ta: "இளம் தம்பதியர் ஐக்கியம் உற்சாகமான இளம் தம்பதியரின் ஒழுங்கான குழுவாகும். ஒவ்வொரு ஞாயிறும் காலை ஆராதனைக்குப் பின் கூடி, தேவனைத் துதித்துப் பாடி, சாட்சிகளைப் பகிர்ந்து, தேவ வசனத்தைத் தியானித்து, ஒருவர் குடும்பத்திற்காக ஒருவர் ஜெபிக்கின்றனர். ஆலயத்தின் இளம் தம்பதியர் அனைவரும் இதில் இணைய ஊக்குவிக்கப்படுகின்றனர்; இந்த ஐக்கிய நேரம் தேவனோடும் பிற தம்பதியரோடும் புத்துணர்ச்சியான பிணைப்பை உருவாக்குகிறது. ஆலயத்தின் எல்லாப் பணிகளுக்கும் இந்த ஐக்கியம் தீவிரமாகத் துணைநிற்கிறது.",
      },
      {
        en: "We ask the church to pray that the young couples among us dedicate themselves to grow in the Lord, build godly families and fulfil God's plan - and, like Aquila and Priscilla, lead Spirit-filled lives and raise a God-fearing generation that brings honour to the name of Jesus.",
        ta: "நம்மிடையே உள்ள இளம் தம்பதியர் கர்த்தருக்குள் வளரவும், தேவபக்தியுள்ள குடும்பங்களைக் கட்டியெழுப்பவும், தேவனுடைய திட்டத்தை நிறைவேற்றவும் தங்களை அர்ப்பணிக்க திருச்சபை ஜெபிக்க வேண்டுகிறோம். ஆக்கில்லா, பிரிஸ்கில்லாளைப் போல ஆவியால் நிரம்பிய வாழ்வு வாழ்ந்து, இயேசுவின் நாமத்திற்கு மகிமை சேர்க்கும் தேவபயமுள்ள தலைமுறையை உருவாக்குவார்களாக.",
      },
    ],
    vision: {
      en: "That the young couples of our church grow in the Lord, build godly families and raise a God-fearing generation.",
      ta: "நம் ஆலயத்தின் இளம் தம்பதியர் கர்த்தருக்குள் வளர்ந்து, தேவபக்தியுள்ள குடும்பங்களைக் கட்டி, தேவபயமுள்ள தலைமுறையை உருவாக்குவது.",
    },
    schedule: {
      en: "Every Sunday, after the morning service",
      ta: "ஒவ்வொரு ஞாயிறும், காலை ஆராதனைக்குப் பின்",
    },
    banner: placeholderImage(150, {
      en: "Young couples gathering",
      ta: "இளம் தம்பதியர் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-3",
        name: person("Mrs. Suneeta Saghayam"),
        designation: { en: "Secretary", ta: "செயலாளர்" },
      },
      {
        id: "fc-4",
        name: person("Mr. P. Sudhakaran"),
        designation: { en: "Treasurer", ta: "பொருளாளர்" },
      },
    ],
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 2,
  },
  {
    ...timestamps,
    id: "fs-3",
    slug: "sunday-school",
    name: { en: "Sunday School", ta: "ஞாயிறு பள்ளி" },
    tagline: {
      en: "“He took the children in his arms and blessed them” - Mark 10:16",
      ta: "“அவர்களை அணைத்துக்கொண்டு... ஆசீர்வதித்தார்” - மாற்கு 10:16",
    },
    about: [
      {
        en: "Sunday Schools began in England in the eighteenth century, for poor children who could not afford an education. They taught good behaviour, manners and moral values, with the Bible as the text - and many children who had never known a church came to know the love of the living God.",
        ta: "கல்வி பெற வசதியில்லாத ஏழைக் குழந்தைகளுக்காக பதினெட்டாம் நூற்றாண்டில் இங்கிலாந்தில் ஞாயிறு பள்ளிகள் தொடங்கப்பட்டன. நல்லொழுக்கம், நன்னடத்தை, நற்பண்புகள் ஆகியவை வேதாகமத்தைப் பாடநூலாகக் கொண்டு கற்பிக்கப்பட்டன; ஆலயத்தையே அறியாத பல குழந்தைகள் ஜீவனுள்ள தேவனின் அன்பை அறிந்துகொண்டனர்.",
      },
      {
        en: "Our Sunday School invests in the foundational years of life, trusting that spiritual nurture in childhood shapes the whole of life. More than 50 children are taught by dedicated teachers through choruses and action songs, memory verses, group discussions, quizzes and games built around the Word of God. Classes meet during the sermon - while the adults study the Word, the children do the same in their own way.",
        ta: "குழந்தைப் பருவத்தில் கிடைக்கும் ஆவிக்குரிய வளர்ப்பு வாழ்நாள் முழுவதையும் வடிவமைக்கும் என்ற நம்பிக்கையுடன், எங்கள் ஞாயிறு பள்ளி வாழ்வின் அடித்தள ஆண்டுகளில் முதலீடு செய்கிறது. 50-க்கும் மேற்பட்ட குழந்தைகளுக்கு அர்ப்பணிப்புள்ள ஆசிரியர்கள் பாடல்கள், அபிநயப் பாடல்கள், மனப்பாட வசனங்கள், குழு விவாதங்கள், வினாடி வினாக்கள், தேவ வசனத்தை மையமாகக் கொண்ட விளையாட்டுகள் வழியாகக் கற்பிக்கின்றனர். பிரசங்க நேரத்தில் வகுப்புகள் நடைபெறுகின்றன - பெரியவர்கள் வசனத்தைக் கற்கும்போது, குழந்தைகளும் தங்கள் வழியில் அதையே செய்கின்றனர்.",
      },
      {
        en: "The children take part in Christmas plays, Children's Sunday and other programmes, and in the Scripture examinations, rallies and competitions of the CSI Diocese of Madras. A children's retreat is held once a year, and every May the church runs a Vacation Bible School for children in and around Madipakkam - children of all faiths take part.",
        ta: "கிறிஸ்துமஸ் நாடகங்கள், சிறுவர் ஞாயிறு மற்றும் பிற நிகழ்ச்சிகளிலும், சி.எஸ்.ஐ. சென்னைப் பேராயம் நடத்தும் வேதாகமத் தேர்வுகள், பேரணிகள், போட்டிகளிலும் குழந்தைகள் பங்கேற்கின்றனர். ஆண்டுக்கு ஒருமுறை சிறுவர் தியான முகாம் நடைபெறுகிறது; ஒவ்வொரு மே மாதமும் மடிப்பாக்கத்தையும் சுற்றுவட்டாரத்தையும் சேர்ந்த குழந்தைகளுக்காக விடுமுறை வேதாகமப் பள்ளி நடத்தப்படுகிறது - எல்லா மதத்தையும் சேர்ந்த குழந்தைகள் பங்கேற்கின்றனர்.",
      },
    ],
    vision: {
      en: "To nurture children in their foundational years, so that the love of God they learn here shapes the whole of their lives.",
      ta: "அடித்தள ஆண்டுகளில் குழந்தைகளை ஆவிக்குரிய முறையில் வளர்த்து, இங்கே அவர்கள் அறியும் தேவ அன்பு அவர்களின் வாழ்நாள் முழுவதையும் வடிவமைக்கச் செய்வது.",
    },
    schedule: {
      en: "Every Sunday, 9:00 AM, during the sermon",
      ta: "ஒவ்வொரு ஞாயிறும், காலை 9:00, பிரசங்க நேரத்தில்",
    },
    memberCount: 50,
    banner: placeholderImage(90, {
      en: "Sunday school class",
      ta: "ஞாயிறு பள்ளி வகுப்பு",
    }),
    committee: [
      {
        id: "fc-5",
        name: person("Mrs. Nalini Nixon"),
        designation: { en: "Superintendent", ta: "கண்காணிப்பாளர்" },
      },
    ],
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 3,
  },
  {
    ...timestamps,
    id: "fs-4",
    slug: "choir",
    name: { en: "Choir", ta: "பாடகர் குழு" },
    tagline: {
      en: "“Sing unto the Lord, O ye saints of his” - Psalm 30:4",
      ta: "“கர்த்தருடைய பரிசுத்தவான்களே, அவரைப் பாடுங்கள்” - சங்கீதம் 30:4",
    },
    about: [
      {
        en: "The choir has been part of St. Mark's since the church began. Around 15 singers, mostly young people, sing in soprano, alto, tenor and bass, and learn new tunes readily alongside the church organist.",
        ta: "ஆலயம் தொடங்கிய காலம் முதலே பாடகர் குழு தூய மாற்கு ஆலயத்தின் ஒரு பகுதியாக இருந்து வருகிறது. பெரும்பாலும் இளைஞர்களைக் கொண்ட சுமார் 15 பாடகர்கள் சோப்ரானோ, ஆல்டோ, டெனர், பேஸ் குரல்களில் பாடுகின்றனர்; ஆலய ஆர்கனிஸ்டுடன் இணைந்து புதிய ராகங்களை எளிதில் கற்றுக்கொள்கின்றனர்.",
      },
      {
        en: "The choir brings our services to life. They prepare special numbers in Tamil and English for every festival and special occasion, have been praised by visitors including the Bishops of our Diocese, and regularly win prizes at singing competitions held by churches across the Diocese. As Psalm 47:6 says, “Sing praises to God, sing praises.”",
        ta: "பாடகர் குழு எங்கள் ஆராதனைகளுக்கு உயிரூட்டுகிறது. ஒவ்வொரு பண்டிகைக்கும் சிறப்பு நிகழ்வுக்கும் தமிழிலும் ஆங்கிலத்திலும் சிறப்புப் பாடல்களைத் தயாரிக்கின்றனர்; நம் பேராயத்தின் பேராயர்கள் உட்பட வருகை தந்தோர் பலரின் பாராட்டைப் பெற்றுள்ளனர்; பேராயத்தின் பல ஆலயங்கள் நடத்தும் பாடல் போட்டிகளில் தொடர்ந்து பரிசுகளை வென்று வருகின்றனர். சங்கீதம் 47:6 சொல்வது போல, “தேவனைக் கீர்த்தனம்பண்ணுங்கள், கீர்த்தனம்பண்ணுங்கள்.”",
      },
      {
        en: "Would you like to join the choir? Please speak to the church office.",
        ta: "பாடகர் குழுவில் இணைய விரும்புகிறீர்களா? ஆலய அலுவலகத்தைத் தொடர்புகொள்ளுங்கள்.",
      },
    ],
    vision: {
      en: "To glorify God with our God-given talents, and to lead the congregation into His presence through music.",
      ta: "தேவன் அருளிய தாலந்துகளால் அவரை மகிமைப்படுத்தி, இசையின் வழியாகச் சபையை அவருடைய சமூகத்திற்குள் வழிநடத்துவது.",
    },
    schedule: {
      en: "Practice every Saturday, 7:00 PM, in the church",
      ta: "ஒவ்வொரு சனிக்கிழமையும் மாலை 7:00, ஆலயத்தில் பயிற்சி",
    },
    memberCount: 15,
    banner: placeholderImage(180, {
      en: "Church choir singing",
      ta: "பாடகர் குழு பாடுதல்",
    }),
    committee: [
      {
        id: "fc-6",
        name: person("Mr. S. Richard Nixon"),
        designation: { en: "In charge", ta: "பொறுப்பாளர்" },
      },
      {
        id: "fc-7",
        name: person("Mr. Isaac Francis P."),
        designation: { en: "Church Organist", ta: "ஆலய ஆர்கனிஸ்ட்" },
      },
    ],
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 4,
  },
  {
    ...timestamps,
    id: "fs-5",
    slug: "womens-fellowship",
    name: { en: "Women's Fellowship", ta: "பெண்கள் ஐக்கியம்" },
    tagline: {
      en: "“Where two or three are gathered in my name” - Matthew 18:20",
      ta: "“இரண்டு பேராவது மூன்று பேராவது என் நாமத்தினாலே” - மத்தேயு 18:20",
    },
    about: [
      {
        en: "The Women's Fellowship brings women together to grow in faith and vision, and to spread the Word of God in their own homes and neighbourhoods. Around 25 women meet every Sunday after the morning service for singing, testimonies, Bible study and meditation on God's Word, and a team gathers in the church every Friday to pray for the church, the congregation, our families and the nation.",
        ta: "பெண்கள் ஐக்கியம் பெண்களை விசுவாசத்திலும் தரிசனத்திலும் வளர ஒன்றுசேர்க்கிறது; தங்கள் வீடுகளிலும் சுற்றுப்புறங்களிலும் தேவ வசனத்தைப் பரப்ப அவர்களை ஊக்குவிக்கிறது. சுமார் 25 பெண்கள் ஒவ்வொரு ஞாயிறும் காலை ஆராதனைக்குப் பின் பாடல், சாட்சிகள், வேதாகம வகுப்பு, தேவ வசனத் தியானத்திற்காகக் கூடுகின்றனர். ஒவ்வொரு வெள்ளிக்கிழமையும் ஒரு குழுவினர் ஆலயத்தில் கூடி ஆலயம், சபை, நம் குடும்பங்கள், தேசம் ஆகியவற்றிற்காக ஜெபிக்கின்றனர்.",
      },
      {
        en: "The fellowship leads many of the church's festive celebrations - setting up breakfast, snack and juice stalls and helping with the auction sales - and prepares and sells pickles, juices and jams to raise funds for the church.",
        ta: "ஆலயத்தின் பல பண்டிகைக் கொண்டாட்டங்களை இந்த ஐக்கியமே முன்னின்று நடத்துகிறது - காலை உணவு, சிற்றுண்டி, பழச்சாறு கடைகளை அமைத்து, ஏல விற்பனைக்கு உதவுகிறது. ஆலயத்திற்கு நிதி திரட்ட ஊறுகாய், பழச்சாறு, ஜாம் தயாரித்து விற்பனை செய்கிறது.",
      },
      {
        en: "Giving is close to their hearts: every Advent the fellowship brings saris, dhotis and new clothes as gifts for people in need, and members visit and support differently-abled people and children who are blind. Every woman is welcome - please do join us.",
        ta: "கொடுத்தல் அவர்கள் இருதயத்திற்கு நெருக்கமானது: ஒவ்வொரு திருவருகைக் காலத்திலும் தேவையுள்ளோருக்குப் பரிசாக சேலைகள், வேட்டிகள், புதிய ஆடைகளை இந்த ஐக்கியம் வழங்குகிறது; மாற்றுத்திறனாளிகளையும் பார்வையற்ற குழந்தைகளையும் உறுப்பினர்கள் சந்தித்து உதவுகின்றனர். எல்லாப் பெண்களும் வரவேற்கப்படுகின்றனர் - எங்களுடன் இணையுங்கள்.",
      },
    ],
    vision: {
      en: "Women coming together to grow in faith and vision, and to share the Word of God in their own homes and neighbourhoods.",
      ta: "பெண்கள் ஒன்றுகூடி விசுவாசத்திலும் தரிசனத்திலும் வளர்ந்து, தங்கள் வீடுகளிலும் சுற்றுப்புறங்களிலும் தேவ வசனத்தைப் பகிர்வது.",
    },
    schedule: {
      en: "Every Sunday after the morning service; prayer every Friday",
      ta: "ஒவ்வொரு ஞாயிறும் காலை ஆராதனைக்குப் பின்; ஒவ்வொரு வெள்ளியும் ஜெபம்",
    },
    memberCount: 25,
    banner: placeholderImage(210, {
      en: "Women's fellowship meeting",
      ta: "பெண்கள் ஐக்கியக் கூட்டம்",
    }),
    // The old site's president was the then presbyter's wife, who has since
    // left with him - omitted rather than shown wrongly. TODO(church-office).
    committee: [
      {
        id: "fc-8",
        name: person("Mrs. A. Latha"),
        designation: { en: "Secretary", ta: "செயலாளர்" },
      },
      {
        id: "fc-9",
        name: person("Mrs. Sheela Wilson"),
        designation: { en: "Treasurer", ta: "பொருளாளர்" },
      },
    ],
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 5,
  },
  {
    ...timestamps,
    id: "fs-6",
    slug: "mens-fellowship",
    name: { en: "Men's Fellowship", ta: "ஆண்கள் ஐக்கியம்" },
    tagline: {
      en: "“How good and pleasant when brethren dwell together in unity” - Psalm 133:1",
      ta: "“சகோதரர் ஒருமித்து வாசம்பண்ணுகிறது எவ்வளவு நன்மை” - சங்கீதம் 133:1",
    },
    about: [
      {
        en: "Around 15 men meet every Sunday morning after the service for an enriching time of Bible study and prayer. Meeting regularly helps them measure their lives against the Word of God, grow in their walk with Jesus Christ and reflect His presence in their lives.",
        ta: "சுமார் 15 சகோதரர்கள் ஒவ்வொரு ஞாயிறும் காலை ஆராதனைக்குப் பின் வேதாகம வகுப்பு மற்றும் ஜெபத்திற்காகக் கூடுகின்றனர். தொடர்ந்து கூடுவது தங்கள் வாழ்வைத் தேவ வசனத்தோடு ஒப்பிட்டுப் பார்க்கவும், இயேசு கிறிஸ்துவுடனான நடையில் வளரவும், அவருடைய பிரசன்னத்தைத் தங்கள் வாழ்வில் பிரதிபலிக்கவும் உதவுகிறது.",
      },
      {
        en: "That growth shows in the responsibilities they carry: fund raising and the food arrangements for the Harvest Festival, the Church Anniversary and the Christmas get-together - work they take on with integrity and with love for the growth of the Body of Christ. Would you like to join this army for Christ? Please speak to the church office.",
        ta: "அந்த வளர்ச்சி அவர்கள் சுமக்கும் பொறுப்புகளில் வெளிப்படுகிறது: அறுப்பின் பண்டிகை, ஆலய ஆண்டு விழா, கிறிஸ்துமஸ் ஒன்றுகூடல் ஆகியவற்றுக்கான நிதி திரட்டலும் உணவு ஏற்பாடுகளும் - கிறிஸ்துவின் சரீரத்தின் வளர்ச்சிக்கான அன்போடும் நேர்மையோடும் இப்பணிகளை ஏற்றுச் செய்கின்றனர். கிறிஸ்துவுக்கான இந்தச் சேனையில் இணைய விரும்புகிறீர்களா? ஆலய அலுவலகத்தைத் தொடர்புகொள்ளுங்கள்.",
      },
    ],
    vision: {
      en: "To grow together in the Word and prayer, and to reflect Christ's presence through committed service to His church.",
      ta: "வசனத்திலும் ஜெபத்திலும் ஒன்றாக வளர்ந்து, அவருடைய சபைக்கான அர்ப்பணிப்புள்ள சேவையால் கிறிஸ்துவின் பிரசன்னத்தைப் பிரதிபலிப்பது.",
    },
    schedule: {
      en: "Every Sunday, after the morning service",
      ta: "ஒவ்வொரு ஞாயிறும், காலை ஆராதனைக்குப் பின்",
    },
    memberCount: 15,
    banner: placeholderImage(240, {
      en: "Men's fellowship gathering",
      ta: "ஆண்கள் ஐக்கியக் கூட்டம்",
    }),
    committee: [
      {
        id: "fc-10",
        name: person("Mr. M. Christdoss"),
        designation: { en: "Secretary", ta: "செயலாளர்" },
      },
      {
        id: "fc-11",
        name: person("Mr. P. Sudhakaran"),
        designation: { en: "Treasurer", ta: "பொருளாளர்" },
      },
    ],
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 6,
  },
  {
    /*
     * The old site had no page for this fellowship. What is written here is
     * only what its Church Timings page states; TODO(church-office): a proper
     * introduction, and who leads it.
     */
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
        en: "The church gathers for Campus Prayer every Wednesday at 7:00 PM, and for a Fasting Prayer on the second Saturday of every month at 10:00 AM. All are welcome. Prayer requests can be given to the church office at any time.",
        ta: "ஒவ்வொரு புதன்கிழமையும் மாலை 7:00 மணிக்கு வளாக ஜெபத்திற்காகவும், ஒவ்வொரு மாதமும் இரண்டாம் சனிக்கிழமை காலை 10:00 மணிக்கு உபவாச ஜெபத்திற்காகவும் சபை கூடுகிறது. அனைவரும் வரவேற்கப்படுகின்றனர். ஜெப வேண்டுதல்களை எப்போது வேண்டுமானாலும் ஆலய அலுவலகத்தில் தெரிவிக்கலாம்.",
      },
    ],
    vision: {
      en: "To be a congregation sustained by constant prayer.",
      ta: "இடைவிடாத ஜெபத்தால் தாங்கப்படும் ஒரு சபையாக இருப்பது.",
    },
    schedule: {
      en: "Wednesdays, 7:00 PM; second Saturday of the month, 10:00 AM",
      ta: "புதன்தோறும் மாலை 7:00; மாதத்தின் இரண்டாம் சனி காலை 10:00",
    },
    banner: placeholderImage(270, {
      en: "Prayer meeting",
      ta: "ஜெபக் கூட்டம்",
    }),
    committee: [],
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 7,
  },
  {
    // No source on the old site. TODO(church-office): which groups belong here.
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
        en: "Alongside the fellowships above, members gather in smaller groups around shared callings. If you would like to start or join one, speak with the church office.",
        ta: "மேலே உள்ள ஐக்கியங்களுடன், பகிர்ந்த அழைப்புகளைச் சுற்றி உறுப்பினர்கள் சிறிய குழுக்களாகக் கூடுகின்றனர். அவற்றில் ஒன்றைத் தொடங்கவோ சேரவோ விரும்பினால், ஆலய அலுவலகத்தைத் தொடர்புகொள்ளுங்கள்.",
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
    coordinator: CHURCH_OFFICE_CONTACT,
    order: 8,
  },
];
