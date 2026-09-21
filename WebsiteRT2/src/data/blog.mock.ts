import type { BlogPost } from "@/types/content";

import { placeholderImage } from "./media";

const timestamps = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

export const BLOG_POSTS: BlogPost[] = [
  {
    ...timestamps,
    id: "bp-1",
    slug: "easter-sunrise-2026-reflection",
    title: {
      en: "Before the light: notes from the Easter sunrise service",
      ta: "வெளிச்சத்திற்கு முன்: உயிர்த்தெழுதல் விடியற்கால ஆராதனையின் குறிப்புகள்",
    },
    excerpt: {
      en: "We gathered in the churchyard while it was still dark, and watched the morning arrive together.",
      ta: "இருட்டாக இருக்கும்போதே ஆலய முற்றத்தில் கூடி, காலை வருவதை ஒன்றாகக் கண்டோம்.",
    },
    body: [
      {
        en: "By half past five the churchyard was already full. Families came with folding chairs and flasks of coffee, children half asleep on shoulders, and we stood together in the dark waiting for a sunrise none of us could hurry.",
        ta: "ஐந்தரை மணிக்கே ஆலய முற்றம் நிரம்பியிருந்தது. குடும்பங்கள் மடக்கு நாற்காலிகளுடனும் காபி குடுவைகளுடனும் வந்தன, குழந்தைகள் தோள்களில் பாதி உறக்கத்தில் இருந்தனர், யாராலும் விரைவுபடுத்த முடியாத ஒரு சூரிய உதயத்திற்காக நாங்கள் இருட்டில் ஒன்றாக நின்றோம்.",
      },
      {
        en: "There is something in waiting together that a service indoors cannot quite reproduce. The first hymn began before anyone could read the words. By the third, the sky behind the cross had turned the colour of weak tea, and the reading from the gospel landed differently than it does at ten in the morning.",
        ta: "உள்ளே நடக்கும் ஆராதனையால் முழுமையாக மீட்டுருவாக்க முடியாத ஒன்று ஒன்றாகக் காத்திருப்பதில் உள்ளது. யாரும் வார்த்தைகளைப் படிக்க முடியாத நிலையிலேயே முதல் பாடல் தொடங்கியது. மூன்றாவது பாடலுக்குள், சிலுவைக்குப் பின்னால் வானம் இளம் தேநீரின் நிறமாக மாறியிருந்தது, சுவிசேஷ வாசகம் காலை பத்து மணிக்கு விழுவதைவிட வேறுவிதமாக விழுந்தது.",
      },
      {
        en: "Afterwards there was breakfast in the parish hall - idli, sambar, and more conversation than the tables could hold. Several people said the same thing on the way out: that they had not expected to be moved, and were.",
        ta: "பின்னர் சபை மண்டபத்தில் காலை உணவு - இட்லி, சாம்பார், மேசைகள் தாங்க முடியாத அளவு உரையாடல். வெளியே செல்லும் வழியில் பலரும் ஒரே விஷயத்தைச் சொன்னார்கள்: தாங்கள் நெகிழ்வார்கள் என எதிர்பார்க்கவில்லை, ஆனால் நெகிழ்ந்தார்கள்.",
      },
    ],
    publishedAt: "2026-04-07",
    author: { en: "Rev. John Samuel", ta: "பணி. ஜான் சாமுவேல்" },
    coverImage: placeholderImage(5, {
      en: "Sunrise behind the church cross",
      ta: "ஆலயச் சிலுவைக்குப் பின்னால் சூரிய உதயம்",
    }),
    eventSlug: "easter-sunrise-service-2026",
    readingMinutes: 4,
  },
  {
    ...timestamps,
    id: "bp-2",
    slug: "sunday-school-annual-day-report",
    title: {
      en: "Ninety children, one stage, and a great deal of glitter",
      ta: "தொண்ணூறு குழந்தைகள், ஒரு மேடை, ஏராளமான மின்னல் தூள்",
    },
    excerpt: {
      en: "A report on the Sunday School annual day, written by one of the teachers.",
      ta: "ஞாயிறு பள்ளி ஆண்டு விழா குறித்து ஓர் ஆசிரியர் எழுதிய அறிக்கை.",
    },
    body: [
      {
        en: "Rehearsals began six weeks out, which sounds like ample time until you have tried to teach a four-year-old shepherd where to stand. The costumes were sewn by a rotating committee of mothers and grandmothers, and the sets were painted on the parish hall floor over three Saturdays.",
        ta: "ஒத்திகைகள் ஆறு வாரங்களுக்கு முன்பே தொடங்கின, நான்கு வயது மேய்ப்பனுக்கு எங்கே நிற்பது என்று கற்பிக்க முயலும் வரை அது போதுமான நேரம் போலத் தோன்றும். ஆடைகளை தாய்மார்களும் பாட்டிமார்களும் மாறி மாறி தைத்தனர், அரங்க அமைப்புகள் மூன்று சனிக்கிழமைகளில் சபை மண்டப தரையில் வரையப்பட்டன.",
      },
      {
        en: "On the day itself, every child had a line, whether or not the line was audible. Prizes were given for attendance, memory verses and craft, and no child left without something in hand - which was, we think, the point.",
        ta: "அந்த நாளில், ஒவ்வொரு குழந்தைக்கும் ஒரு வசனம் இருந்தது, அது கேட்டதோ இல்லையோ. வருகை, மனனப் பாடல்கள், கைவினைக்குப் பரிசுகள் வழங்கப்பட்டன, எந்தக் குழந்தையும் கையில் ஏதாவது இல்லாமல் செல்லவில்லை - அதுவே நோக்கம் என்று நினைக்கிறோம்.",
      },
    ],
    publishedAt: "2026-03-18",
    author: { en: "Mrs. Grace Mary", ta: "திருமதி. கிரேஸ் மேரி" },
    coverImage: placeholderImage(105, {
      en: "Children performing on stage",
      ta: "மேடையில் நிகழ்ச்சி நடத்தும் குழந்தைகள்",
    }),
    eventSlug: "sunday-school-annual-day-2026",
    fellowshipSlug: "sunday-school",
    readingMinutes: 3,
  },
  {
    ...timestamps,
    id: "bp-3",
    slug: "why-we-sing-in-two-languages",
    title: {
      en: "Why we sing in two languages",
      ta: "நாம் ஏன் இரு மொழிகளில் பாடுகிறோம்",
    },
    excerpt: {
      en: "On Tamil and English in our worship, and what is gained by keeping both.",
      ta: "நம் ஆராதனையில் தமிழும் ஆங்கிலமும், இரண்டையும் வைத்திருப்பதால் கிடைப்பது என்ன.",
    },
    body: [
      {
        en: "A congregation that worships in two languages is doing something more difficult than it appears. It is choosing, week after week, not to let convenience decide who feels at home.",
        ta: "இரு மொழிகளில் ஆராதிக்கும் ஒரு சபை தோற்றத்தைவிட கடினமான ஒன்றைச் செய்கிறது. வசதி என்பது யார் வீட்டில் இருப்பதாக உணர்கிறார்கள் என்பதைத் தீர்மானிக்க விடாமல், வாரம் வாரம் தேர்ந்தெடுக்கிறது.",
      },
      {
        en: "Our grandparents' hymns carry a grammar of faith that does not always survive translation. Our children's English carries a directness that Tamil sometimes softens. Keeping both means nobody is asked to leave part of themselves at the door.",
        ta: "நம் தாத்தா பாட்டிகளின் பாடல்கள் மொழிபெயர்ப்பில் எப்போதும் தப்பிப்பிழைக்காத ஒரு விசுவாச இலக்கணத்தைச் சுமக்கின்றன. நம் குழந்தைகளின் ஆங்கிலம் தமிழ் சில நேரங்களில் மென்மையாக்கும் ஒரு நேரடித்தன்மையைச் சுமக்கிறது. இரண்டையும் வைத்திருப்பது என்பது தன்னில் ஒரு பகுதியை வாசலில் விட்டுவிடும்படி யாரும் கேட்கப்படுவதில்லை என்பதாகும்.",
      },
    ],
    publishedAt: "2026-02-11",
    author: { en: "Mr. Samuel Raja", ta: "திரு. சாமுவேல் ராஜா" },
    coverImage: placeholderImage(180, {
      en: "The choir during a service",
      ta: "ஆராதனையின்போது கீர்த்தனைக் குழு",
    }),
    fellowshipSlug: "choir",
    readingMinutes: 5,
  },
  {
    ...timestamps,
    id: "bp-4",
    slug: "youth-fellowship-retreat-notes",
    title: {
      en: "A weekend away: notes from the youth retreat",
      ta: "ஒரு வார இறுதி விலகல்: இளைஞர் விலகல் முகாமின் குறிப்புகள்",
    },
    excerpt: {
      en: "Forty young people, two days in the hills, and the conversations that only happen away from the noise.",
      ta: "நாற்பது இளைஞர்கள், மலைகளில் இரண்டு நாட்கள், இரைச்சலில் இருந்து விலகும்போது மட்டுமே நிகழும் உரையாடல்கள்.",
    },
    body: [
      {
        en: "We left early on Saturday with a bus full of guitars, sleeping bags and more snacks than any of us could reasonably eat. By the time we reached the retreat centre the city had fallen away, and with it a little of the hurry we carry without noticing.",
        ta: "சனிக்கிழமை அதிகாலையில், கிடார்கள், தூங்கும் பைகள், நம் அனைவராலும் நியாயமாக சாப்பிட முடியாத அளவு சிற்றுண்டிகளுடன் நிறைந்த பேருந்தில் புறப்பட்டோம். முகாம் மையத்தை அடையும் நேரத்தில் நகரம் விலகியிருந்தது, அதனுடன் நாம் கவனிக்காமல் சுமக்கும் அவசரமும் சிறிது விலகியது.",
      },
      {
        en: "The sessions were good, but it was the unscheduled hours that stayed with people - late conversations by the fire, a morning walk, the slow discovery that faith is easier to talk about when you are not in a hurry. We came back tired and, in the way that matters, rested.",
        ta: "அமர்வுகள் நன்றாக இருந்தன, ஆனால் நேரம் ஒதுக்கப்படாத மணிநேரங்களே மக்களுடன் தங்கின - நெருப்பருகே இரவு உரையாடல்கள், ஒரு காலை நடை, அவசரத்தில் இல்லாதபோது விசுவாசத்தைப் பற்றிப் பேசுவது எளிது என்ற மெதுவான கண்டுபிடிப்பு. நாங்கள் சோர்வுடன், ஆனால் முக்கியமான விதத்தில் ஓய்வுடன் திரும்பினோம்.",
      },
    ],
    publishedAt: "2026-05-20",
    author: { en: "Rev. Daniel Raj", ta: "பணி. டேனியல் ராஜ்" },
    coverImage: placeholderImage(30, {
      en: "Young people at the retreat centre",
      ta: "விலகல் முகாம் மையத்தில் இளைஞர்கள்",
    }),
    fellowshipSlug: "youth-fellowship",
    readingMinutes: 4,
  },
  {
    ...timestamps,
    id: "bp-5",
    slug: "building-a-home-together",
    title: {
      en: "Building a home, not just a household",
      ta: "ஒரு குடும்பம் மட்டுமல்ல, ஒரு வீட்டைக் கட்டுதல்",
    },
    excerpt: {
      en: "Notes from a season of marriage-enrichment evenings, and what young couples told us they needed most.",
      ta: "திருமண வளர்ச்சி மாலைகளின் ஒரு பருவத்தின் குறிப்புகள், இளம் தம்பதியர்கள் தங்களுக்கு மிகவும் தேவை என்று சொன்னது என்ன.",
    },
    body: [
      {
        en: "Once a month we set out chairs in a circle, put on the kettle, and let couples talk honestly about the ordinary work of staying close - money, in-laws, tiredness, and the small resentments that grow quietly if left alone.",
        ta: "மாதம் ஒருமுறை நாற்காலிகளை வட்டமாக அமைத்து, தண்ணீரைக் காய்ச்சி, நெருக்கமாக இருப்பதற்கான சாதாரண உழைப்பைப் பற்றி - பணம், மாமியார் வீட்டார், சோர்வு, தனியே விடப்பட்டால் அமைதியாக வளரும் சிறு புகார்கள் - தம்பதியர்கள் நேர்மையாகப் பேச விடுகிறோம்.",
      },
      {
        en: "What people asked for, again and again, was not advice but company: other couples a few years ahead, willing to say that they had struggled too. That is what the fellowship tries to be - not a class, but a room where no one has to pretend.",
        ta: "மக்கள் மீண்டும் மீண்டும் கேட்டது அறிவுரை அல்ல, துணை: சில ஆண்டுகள் முன்னதாக இருக்கும் மற்ற தம்பதியர்கள், தாங்களும் போராடியதாகச் சொல்ல தயாராக இருப்பவர்கள். ஐக்கியம் அதுவாகவே இருக்க முயல்கிறது - ஒரு வகுப்பு அல்ல, யாரும் பாசாங்கு செய்ய வேண்டியதில்லாத ஓர் அறை.",
      },
    ],
    publishedAt: "2026-04-22",
    author: { en: "Mrs. Esther Vimala", ta: "திருமதி. எஸ்தர் விமலா" },
    coverImage: placeholderImage(75, {
      en: "Young couples in conversation",
      ta: "உரையாடலில் இளம் தம்பதியர்கள்",
    }),
    fellowshipSlug: "young-couple-fellowship",
    readingMinutes: 4,
  },
  {
    ...timestamps,
    id: "bp-6",
    slug: "hands-that-serve-womens-fellowship",
    title: {
      en: "The hands behind every meal",
      ta: "ஒவ்வொரு உணவின் பின்னும் இருக்கும் கைகள்",
    },
    excerpt: {
      en: "A quiet account of the women whose service holds the church together, mostly unseen.",
      ta: "பெரும்பாலும் கண்ணுக்குத் தெரியாமல், தங்கள் சேவையால் திருச்சபையை ஒன்றாக வைத்திருக்கும் பெண்களைப் பற்றிய ஒரு அமைதியான குறிப்பு.",
    },
    body: [
      {
        en: "For every wedding, funeral and festival, there is a kitchen that opened before dawn. The Women's Fellowship cooks for hundreds without a roster anyone outside would recognise, and clears away long after the last guest has gone home.",
        ta: "ஒவ்வொரு திருமணம், இறுதிச் சடங்கு, விழாவிற்கும், விடியலுக்கு முன்பே திறந்த ஒரு சமையலறை உண்டு. மகளிர் ஐக்கியம், வெளியாருக்குத் தெரியாத ஒரு பட்டியலின்றி நூற்றுக்கணக்கானோருக்குச் சமைக்கிறது, கடைசி விருந்தினரும் வீடு திரும்பிய நெடுநேரத்திற்குப் பின்னும் சுத்தம் செய்கிறது.",
      },
      {
        en: "This year the fellowship also began visiting the housebound of the parish, carrying a hot meal and, more importantly, an hour of company. It is not glamorous work. It is, we are increasingly sure, the shape love actually takes.",
        ta: "இந்த ஆண்டு ஐக்கியம், சபையில் வீட்டை விட்டு வெளியேற முடியாதவர்களைச் சந்திக்கவும் தொடங்கியது, ஒரு சூடான உணவையும், இன்னும் முக்கியமாக, ஒரு மணிநேரத் துணையையும் எடுத்துச் சென்றது. இது ஆடம்பரமான வேலை அல்ல. அன்பு உண்மையில் எடுக்கும் வடிவம் இதுவே என்று நாங்கள் மேலும் மேலும் உறுதியாக நம்புகிறோம்.",
      },
    ],
    publishedAt: "2026-03-30",
    author: { en: "Mrs. Ruth Jeyanthi", ta: "திருமதி. ரூத் ஜெயந்தி" },
    coverImage: placeholderImage(120, {
      en: "The fellowship kitchen at work",
      ta: "வேலையில் ஐக்கியச் சமையலறை",
    }),
    fellowshipSlug: "womens-fellowship",
    readingMinutes: 3,
  },
  {
    ...timestamps,
    id: "bp-7",
    slug: "early-mornings-mens-fellowship",
    title: {
      en: "What the men talk about at six in the morning",
      ta: "ஆடவர்கள் காலை ஆறு மணிக்கு எதைப் பற்றிப் பேசுகிறார்கள்",
    },
    excerpt: {
      en: "On the monthly prayer breakfast, and why grown men keep turning up before sunrise.",
      ta: "மாதாந்திர ஜெப காலை உணவைப் பற்றியும், வளர்ந்த ஆடவர்கள் சூரிய உதயத்திற்கு முன்பே ஏன் தொடர்ந்து வருகிறார்கள் என்பதைப் பற்றியும்.",
    },
    body: [
      {
        en: "The men's fellowship meets at an hour most people would rather sleep through. There is coffee, a simple breakfast, a short reading, and then the part that matters: men talking plainly about work, fathers, failure and faith, in a way they rarely do elsewhere.",
        ta: "ஆடவர் ஐக்கியம் பெரும்பாலானோர் தூங்க விரும்பும் ஒரு மணிநேரத்தில் கூடுகிறது. காபி, எளிய காலை உணவு, ஒரு குறுகிய வாசிப்பு, பின்னர் முக்கியமான பகுதி: ஆடவர்கள் வேலை, தந்தையர், தோல்வி, விசுவாசம் பற்றி வேறெங்கும் அரிதாகப் பேசும் விதத்தில் வெளிப்படையாகப் பேசுகிறார்கள்.",
      },
      {
        en: "No one is asked to have answers. Over months, though, a kind of trust builds that follows the men out of the room - into how they carry their homes, their tempers and their quiet burdens through the rest of the week.",
        ta: "யாரும் பதில்களை வைத்திருக்கும்படி கேட்கப்படுவதில்லை. எனினும், மாதங்கள் கடக்க, ஒருவித நம்பிக்கை உருவாகி, அந்த அறையிலிருந்து வெளியே ஆடவர்களைப் பின்தொடர்கிறது - வாரத்தின் மீதி நாட்களில் அவர்கள் தங்கள் வீடுகளையும், கோபங்களையும், அமைதியான சுமைகளையும் சுமக்கும் விதத்திற்குள்.",
      },
    ],
    publishedAt: "2026-02-28",
    author: { en: "Mr. Stephen Kumar", ta: "திரு. ஸ்டீபன் குமார்" },
    coverImage: placeholderImage(165, {
      en: "The men's prayer breakfast",
      ta: "ஆடவர் ஜெப காலை உணவு",
    }),
    fellowshipSlug: "mens-fellowship",
    readingMinutes: 3,
  },
  {
    ...timestamps,
    id: "bp-8",
    slug: "praying-through-the-week",
    title: {
      en: "The prayer list nobody sees",
      ta: "யாரும் காணாத ஜெபப் பட்டியல்",
    },
    excerpt: {
      en: "Inside the intercession that carries the congregation's names, week after week.",
      ta: "வாரம் வாரம் சபையின் பெயர்களைச் சுமக்கும் பரிந்துரை ஜெபத்தின் உள்ளே.",
    },
    body: [
      {
        en: "Every request left in the box at the back of the church finds its way to the prayer fellowship. Illnesses, exams, marriages under strain, jobs lost and hoped for - names are read out and held, without comment or gossip, in confidence.",
        ta: "ஆலயத்தின் பின்புறம் உள்ள பெட்டியில் விடப்படும் ஒவ்வொரு வேண்டுதலும் ஜெப ஐக்கியத்தை அடைகிறது. நோய்கள், தேர்வுகள், நெருக்கடியில் உள்ள திருமணங்கள், இழந்த மற்றும் எதிர்பார்க்கப்படும் வேலைகள் - பெயர்கள் வாசிக்கப்பட்டு, கருத்தோ வதந்தியோ இன்றி, ரகசியமாகப் பற்றிக்கொள்ளப்படுகின்றன.",
      },
      {
        en: "It is unseen work, and deliberately so. But those who have been prayed for through a hard season know its weight - the strange comfort of learning, later, that while you struggled, a small room of people was holding your name to God.",
        ta: "இது கண்ணுக்குத் தெரியாத வேலை, வேண்டுமென்றே அப்படித்தான். ஆனால் ஒரு கடினமான பருவத்தில் ஜெபிக்கப்பட்டவர்கள் அதன் எடையை அறிவார்கள் - நீங்கள் போராடிக்கொண்டிருந்தபோது, ஒரு சிறிய அறையில் மக்கள் உங்கள் பெயரைக் கடவுளிடம் பற்றியிருந்தார்கள் என்று பின்னர் அறிவதன் விசித்திரமான ஆறுதல்.",
      },
    ],
    publishedAt: "2026-01-24",
    author: { en: "Mrs. Esther Vimala", ta: "திருமதி. எஸ்தர் விமலா" },
    coverImage: placeholderImage(210, {
      en: "Hands folded in prayer",
      ta: "ஜெபத்தில் கூப்பிய கைகள்",
    }),
    fellowshipSlug: "prayer-fellowship",
    readingMinutes: 3,
  },
  {
    ...timestamps,
    id: "bp-9",
    slug: "small-groups-across-the-parish",
    title: {
      en: "The small groups that meet in living rooms",
      ta: "வரவேற்பறைகளில் கூடும் சிறு குழுக்கள்",
    },
    excerpt: {
      en: "A look at the neighbourhood cottage meetings that carry the church into the week.",
      ta: "திருச்சபையை வாரத்திற்குள் எடுத்துச் செல்லும் அக்கம்பக்க வீட்டுக் கூட்டங்களைப் பற்றிய ஒரு பார்வை.",
    },
    body: [
      {
        en: "Not everything happens under the church roof. Across Madipakkam, small groups gather midweek in homes - a dozen neighbours, a pot of tea, a passage of scripture, and the ordinary sharing of one another's weeks.",
        ta: "எல்லாமே ஆலயக் கூரையின் கீழ் நடப்பதில்லை. மடிப்பாக்கம் முழுவதும், சிறு குழுக்கள் வார நடுவில் வீடுகளில் கூடுகின்றன - ஒரு டஜன் அயலவர்கள், ஒரு பானை தேநீர், ஒரு வேதப் பகுதி, ஒருவரின் வாரங்களை மற்றவருடன் சாதாரணமாகப் பகிர்தல்.",
      },
      {
        en: "These cottage meetings are often where newcomers first feel they belong, and where prayer becomes specific and personal. They are the church at its smallest scale, and in many ways its most honest.",
        ta: "இந்த வீட்டுக் கூட்டங்களே பெரும்பாலும் புதியவர்கள் முதலில் தாங்கள் சேர்ந்தவர்கள் என உணரும் இடம், ஜெபம் குறிப்பிட்டதாகவும் தனிப்பட்டதாகவும் மாறும் இடம். அவை மிகச் சிறிய அளவில் திருச்சபை, பல வழிகளில் அதன் மிக நேர்மையான வடிவம்.",
      },
    ],
    publishedAt: "2026-01-12",
    author: { en: "Church Office", ta: "திருச்சபை அலுவலகம்" },
    coverImage: placeholderImage(255, {
      en: "A small group meeting in a home",
      ta: "வீட்டில் கூடும் ஒரு சிறு குழு",
    }),
    fellowshipSlug: "other-fellowships",
    readingMinutes: 3,
  },
];
