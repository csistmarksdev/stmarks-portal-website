import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import type { CSSProperties } from "react";

import { IlluminatedDivider } from "@/components/common/ornament";
import { Container } from "@/components/ui/container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { readMaintenanceHeader, type MaintenanceState } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import en from "@/messages/en.json";
import ta from "@/messages/ta.json";

type Lang = "en" | "ta";

// The notice is read from the request every time — never a cached copy.
export const dynamic = "force-dynamic";

const COPY = {
  en: {
    eyebrow: "Down for maintenance",
    heading: "We'll be back soon",
    back: "Expected back",
    refresh: "This page checks again by itself — no need to reload.",
    title: "Back soon · CSI St. Mark's Church",
  },
  ta: {
    eyebrow: "பராமரிப்பு நடைபெறுகிறது",
    heading: "விரைவில் மீண்டும் வருகிறோம்",
    back: "எதிர்பார்க்கப்படும் நேரம்",
    refresh: "இந்தப் பக்கம் தானாகவே மீண்டும் சரிபார்க்கும் — புதுப்பிக்க வேண்டியதில்லை.",
    title: "விரைவில் · தூய மாற்கு ஆலயம்",
  },
} as const;

const WORDMARK = { en: en.site.wordmark, ta: ta.site.wordmark };

const FALLBACK_MESSAGE = {
  en: "The website is being updated and will be back shortly. Thank you for your patience.",
  ta: "இணையதளம் புதுப்பிக்கப்படுகிறது, விரைவில் மீண்டும் கிடைக்கும். உங்கள் பொறுமைக்கு நன்றி.",
};

/*
 * A block in the other language carries that language's faces, exactly as
 * `html[lang]` sets them for a whole page in globals.css: Noto Serif/Sans
 * Tamil with the looser leading Tamil needs, or Fraunces/Inter with the
 * display tracking Fraunces is tuned for.
 */
const LANG_FACES: Record<Lang, CSSProperties> = {
  ta: {
    ["--font-display" as string]: 'var(--font-noto-serif-tamil), "Latha", serif',
    ["--font-sans" as string]: 'var(--font-noto-tamil), "Latha", sans-serif',
    fontFamily: "var(--font-tamil)",
    lineHeight: 1.75,
  },
  en: {
    ["--font-display" as string]: 'var(--font-fraunces), "Georgia", serif',
    ["--font-sans" as string]: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    fontFamily: "var(--font-sans)",
  },
};

async function request(): Promise<{ state: MaintenanceState; lang: Lang }> {
  const h = await headers();
  return {
    state: readMaintenanceHeader(h.get("x-maintenance-state")),
    lang: h.get("x-maintenance-locale") === "en" ? "en" : "ta",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await request();
  return { title: { absolute: COPY[lang].title } };
}

function expectedBack(until: string | undefined, lang: Lang): string | null {
  if (!until) return null;
  const date = new Date(until);
  if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) return null;
  return new Intl.DateTimeFormat(lang === "ta" ? "ta-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function BackBy({ when, lang }: { when: string; lang: Lang }) {
  return (
    // A pill on one line; on a phone a long date (Tamil especially) wraps
    // inside it instead of pushing past the edge of the screen.
    <p className="mt-6 inline-flex max-w-full items-start gap-2.5 rounded-3xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 backdrop-blur-md sm:items-center sm:rounded-full">
      <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-300 sm:mt-0" />
      <span className="min-w-0">
        <span className="text-white/65">{COPY[lang].back}: </span>
        <time>{when}</time>
      </span>
    </p>
  );
}

/**
 * The maintenance notice, in the site's own hero language: a full screen of
 * the church under the evening scrim, the parish lockup at the head, and the
 * copy set into the foot of the frame — the visitor's language first, the
 * other beneath the struck cross.
 */
export default async function MaintenancePage() {
  // Only ever shown through the proxy's rewrite, which sends the state along.
  // Reached any other way (a stale link while the site is up), go home.
  if (!(await headers()).has("x-maintenance-state")) redirect("/");

  const { state, lang } = await request();
  const other: Lang = lang === "en" ? "ta" : "en";
  const message = {
    en: state.message.en.trim() || FALLBACK_MESSAGE.en,
    ta: state.message.ta.trim() || FALLBACK_MESSAGE.ta,
  };
  const back = { en: expectedBack(state.until, "en"), ta: expectedBack(state.until, "ta") };

  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-sand-950 text-white">
      <Image
        src="/hero/about/01.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[50%_30%]"
      />
      {/* The same two scrims every hero on the site lays over its photograph. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/60 to-black/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-black/65 via-black/25 to-transparent"
      />

      {/* The parish lockup, as it sits in the site header. */}
      <header className="flex items-center justify-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)]">
        <Image
          src="/brand/csi-emblem-96-v2.webp"
          alt=""
          width={96}
          height={96}
          unoptimized
          className="size-10 object-contain drop-shadow"
        />
        <span className="flex flex-col text-center leading-[1.15]" lang={lang} style={LANG_FACES[lang]}>
          <span className="font-display text-[0.95rem] font-semibold">{WORDMARK[lang].line1}</span>
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-white/70">
            {WORDMARK[lang].line2}
          </span>
        </span>
        <Image
          src="/brand/arms-96-v2.webp"
          alt=""
          width={58}
          height={96}
          unoptimized
          className="h-10 w-auto object-contain drop-shadow"
        />
      </header>

      <Container className="relative mt-auto w-full pb-[calc(env(safe-area-inset-bottom)+3.5rem)] pt-24 sm:pb-20">
        <div className="max-w-3xl">
          <section lang={lang} style={LANG_FACES[lang]}>
            <Eyebrow tone="onDark">{COPY[lang].eyebrow}</Eyebrow>
            <Heading
              as="h1"
              level="display"
              tone="onDark"
              className={cn("mt-5", lang === "en" && "tracking-[-0.02em]")}
            >
              {COPY[lang].heading}
            </Heading>
            <Text size="xl" tone="onDark" className="mt-5 max-w-2xl">
              {message[lang]}
            </Text>
            {back[lang] ? <BackBy when={back[lang]} lang={lang} /> : null}
          </section>

          <IlluminatedDivider tone="onDark" className="my-10 justify-start sm:my-12" />

          <section lang={other} style={LANG_FACES[other]}>
            <Heading
              as="h2"
              level="h3"
              tone="onDark"
              className={cn(other === "en" && "tracking-[-0.02em]")}
            >
              {COPY[other].heading}
            </Heading>
            <Text size="lg" tone="onDark" className="mt-3 max-w-2xl">
              {message[other]}
            </Text>
            {back[other] ? <BackBy when={back[other]} lang={other} /> : null}
          </section>

          <p className="mt-12 text-xs text-white/45" lang={lang} style={LANG_FACES[lang]}>
            {COPY[lang].refresh}
          </p>
        </div>
      </Container>
    </main>
  );
}
