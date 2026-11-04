"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { isMotionReduced, skipsSplash } from "@/lib/motion-preference";

import {
  AshBowl,
  AshCross,
  BareTree,
  Bauble,
  Bell,
  Butterfly,
  Calvary,
  Candle,
  CandyCane,
  EmptyCross,
  Gift,
  HangingStar,
  Holly,
  Lily,
  PalmFrond,
  Stone,
  Thorns,
  Tree,
  Veil,
  Wreath,
} from "@/components/common/section-ornaments";
import {
  CINEMATIC,
  GENTLE,
  createMontage,
  planMontage,
  shuffleOrder,
} from "@/lib/splash-montage";


/**
 * The opening frame: the parish crest set in a drawn arch on white, held while
 * the document finishes becoming the site.
 *
 * Marked `"use client"` for its dismissal effect, but it is still rendered on
 * the server, so the overlay is present in the very first bytes of HTML - it
 * covers the page from the first paint rather than appearing a moment later,
 * which would be the one thing worse than no splash at all.
 *
 * What it is actually hiding is the web-font swap. Three families load with
 * `display: swap` here, so an unmasked first paint sets the wordmark and every
 * heading in a fallback and then re-flows them into Fraunces and Inter a beat
 * later. Holding it until `document.fonts.ready` means the reader's first
 * sight of the page is the typography we chose.
 *
 * It deliberately does *not* wait on `window.load`. That would include the
 * hero photography - several megabytes with its own fade-in - and would leave
 * the crest sitting there long after the site behind it was ready to be read.
 *
 * It is a title card, not a loading screen, and the distinction decides
 * everything else about it. It is struck on the parish's own photography
 * under the same grade the hero uses, so the seal, the arch, the church's
 * name and the leader along the foot are the light things on a dark plate -
 * which is what the page behind it looks like too.
 *
 * It does not fade and it does not morph onto the masthead. It lifts: the
 * whole card travels straight up and off the top of the window in two thirds
 * of a second, carrying the last photograph of the montage, the seal and the
 * finished leader with it, and the site is behind it. Because both sides of
 * the join are dark photography under the same grade, the thing that makes
 * the lift legible is the hairline of gilt along its lower edge and the
 * shadow it throws down the page - see the hand-over section of `globals.css`
 * for the timeline the constants below are keyed to.
 */

/**
 * Held at least this long: the arch finishes drawing at 1520ms and its
 * springing points land at 1840ms.
 *
 * Long for a splash, and deliberately so - the arch is meant to be watched
 * being struck, and cutting it off half-drawn would be worse than not drawing
 * it. The floor only bites on a warm cache; a first visit is normally still
 * waiting on fonts well past it, so this is not time added to a real load, it
 * is time the sequence would have had anyway being used rather than wasted.
 *
 * A floor, not the duration. What actually decides when the splash leaves is
 * the montage finishing - see the two gates in the effect. This only bites when
 * the montage is over before the arch has finished being drawn, which happens
 * when `public/hero` holds a handful of photographs rather than fifty.
 */
const MIN_VISIBLE_MS = 1900;

/**
 * Hard ceiling. Whatever we are waiting for, the site is server-rendered and
 * readable - after this we get out of the way and let it finish arriving in
 * the open.
 *
 * The floor under the ceiling, rather than the ceiling itself: the real one is
 * computed from the montage's own length, since the splash now waits for the
 * sequence to finish. See `maxHold` in the effect.
 */
const MAX_VISIBLE_MS = 3600;

/** The least the montage is allowed to overrun by before the ceiling fires. */
const MAX_OVERRUN_MS = 900;

/**
 * The lift: how long the card takes to travel up and off the screen.
 *
 * Keyed to `--splash-exit-ms` in `globals.css`, which owns the timing and the
 * easing for all five things moving on this clock - the card, its lit edge,
 * and the three planes of parallax inside it. This constant exists only to
 * decide when the overlay is unmounted, so it has to be the larger of the two
 * if they ever disagree; they should not.
 *
 * Fast, and deliberately. The reader has just watched fifty-four photographs
 * of the parish over seven seconds; the one thing the ending must not be is
 * another thing to sit through. A lift this quick is a door being opened, and
 * what makes it read as premium is not its length but the breath before it,
 * the lit edge on it and the three speeds inside it - none of which cost
 * time.
 */
const EXIT_MS = 700;

/**
 * When the overlay is unmounted: a couple of frames after the card has left
 * the screen, so nothing is torn out from under an animation still running.
 */
const UNMOUNT_MS = EXIT_MS + 80;

/**
 * The finale: how long the last photograph is held, alone and at rest, after
 * the bar reaches 100% and before the splash begins to leave.
 *
 * Without it the montage's fastest cut is also its last image and the white
 * lifts on top of a strobe, which reads as the sequence being interrupted
 * rather than ending. A beat of stillness is what turns a run of frames into
 * an arrival.
 *
 * Lengthened along with the montage: the sequence now finishes at about
 * eighteen photographs a second, and the eye needs longer to settle on a still
 * frame after that than it did after the gentler ending it used to have.
 */
const FINAL_HOLD_MS = 550;

/**
 * How far ahead of the cut the montage re-checks that the coming frames have
 * been asked for.
 *
 * Every image is requested up front now, so this is a backstop rather than the
 * loading strategy: it catches a frame whose `src` was somehow never set, on a
 * connection slow enough for that to matter.
 */
const LOOKAHEAD = 10;

export interface SplashScreenProps {
  /**
   * Every photograph the montage will show, in manifest order - the runtime
   * shuffle happens in the effect, not here.
   *
   * Comes from `generated/hero-images.ts`, which `scripts/generate-hero-manifest.mjs`
   * writes from the contents of `public/hero` on every `predev` and `prebuild`.
   * The component neither knows nor cares how many there are.
   */
  reel?: string[];
}

export function SplashScreen({ reel = [] }: SplashScreenProps) {
  const t = useTranslations("common");

  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");
  const crestRef = useRef<HTMLImageElement>(null);
  const groundRef = useRef<HTMLSpanElement>(null);
  const reelRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<SVGSVGElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  /*
   * The progress state lives in refs and is written straight to the DOM, never
   * through `setState`.
   *
   * A determinate bar changes sixty times a second, and this component renders
   * five seasons' worth of ornament: re-rendering that tree on every frame -
   * during hydration, which is the one moment the main thread has nothing to
   * spare - would cost more than the bar is worth. The two nodes that actually
   * change are addressed directly.
   */
  const doneRef = useRef(false);

  /**
   * Where the montage has got to: how many photographs have been shown, out of
   * how many there are, and when the current one went up. The bar is computed
   * from this and nothing else, so the number under the crest is always a true
   * statement about the sequence the reader is watching.
   */
  const beatRef = useRef<{
    shown: number;
    total: number;
    start: number;
    hold: number;
  }>({ shown: 0, total: 1, start: 0, hold: 1 });

  useEffect(() => {
    /*
     * Simple mode skips the opening altogether - and so does the reload that
     * switching modes causes, in either direction: the reader has seen the
     * opening already and only asked to change how the site moves.
     *
     * The reader asked for a plain, light site, and this screen is the
     * heaviest thing on it - a montage of every photograph under `public/hero`,
     * fetched here. CSS already hides it from the first paint (see
     * `globals.css`); returning before anything below runs means no scroll
     * lock, no hold on the hero's title (`data-splash-alive` is never set) and
     * none of those photographs requested. Only Simple mode: the device's
     * reduced-motion setting still gets the montage, for the reasons given
     * further down.
     */
    if (skipsSplash()) {
      const timer = window.setTimeout(() => setPhase("gone"), 0);
      return () => window.clearTimeout(timer);
    }

    const start = performance.now();
    const timers: number[] = [];

    let settled = false;

    /*
     * The scroll lock is owned entirely by this effect - set when it runs,
     * released when it dismisses. That is the point: a document whose JS never
     * arrives never gets locked in the first place, and the CSS failsafe on
     * `.splash-shell` lifts the curtain without us. A lock rendered into the
     * server HTML instead would have no way back out in that case, and would
     * hand the reader a page they could see but not scroll.
     */
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "clip";

    /*
     * Take the CSS failsafe off the table.
     *
     * `globals.css` fades this overlay out unconditionally at 5.2 seconds, for
     * the document whose JavaScript never arrives. This effect running *is* the
     * JavaScript arriving, so from here the splash is governed by the timings
     * below - which know how long the montage is - rather than by a constant
     * written when the whole screen lasted a second and a half.
     *
     * Removed again in `release`, so a torn-down effect hands the failsafe back
     * rather than leaving an overlay nothing will dismiss.
     */
    root.dataset.splashAlive = "";

    const release = () => {
      root.style.overflow = previousOverflow;
      delete root.dataset.splashLite;
      delete root.dataset.splashAlive;
      /*
       * Not deleted alongside the others on a normal exit - by then it is the
       * only thing keeping the hero's lines in place, and removing it would put
       * them back under the holding rule and blink them out. This runs when the
       * effect is torn down, at which point `data-splash-alive` goes with it and
       * the holding rule cannot match anything anyway.
       */
      delete root.dataset.splashRevealing;
    };

    const prefersReducedMotion = isMotionReduced();

    /*
     * The lite tier.
     *
     * Three of the things on this screen loop forever while it is up - the
     * bloom breathing, six motes drifting, the rule sweeping. Each is one
     * composited layer being ticked every frame, which is nothing on a laptop
     * and is not nothing on a four-core phone that is also hydrating a React
     * tree. They are the first things to go, because they are the only things
     * here that are purely decorative: the arch still draws, the crest still
     * flies, the morph still lands.
     *
     * `hardwareConcurrency` is a blunt signal and the only broadly supported
     * one - there is no media query for "this device is slow". Four or fewer
     * cores is genuinely low-end territory now rather than merely modest.
     * `saveData` is honoured alongside it: a reader who has asked the browser
     * to economise has told us plainly enough.
     */
    const isLite =
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection?.saveData === true;

    if (isLite) root.dataset.splashLite = "";

    /* ---------------------------------------------------------------------- */
    /* The montage                                                            */
    /* ---------------------------------------------------------------------- */

    /*
     * Every photograph under `public/hero` is in the markup, one `img` each -
     * see `generated/hero-images.ts`, which `scripts/generate-hero-manifest.mjs`
     * writes from that folder on every `predev` and `prebuild`, and
     * `scripts/verify-splash-montage.mjs`, which asserts that what is on disk,
     * what is in the manifest and what the sequence visits are the same
     * number.
     *
     * Only the first carries a `src`; the rest are given theirs here.
     */
    const frames = Array.from(
      reelRef.current?.querySelectorAll<HTMLImageElement>("img") ?? [],
    );

    const count = frames.length;

    /*
     * There is no short version, and no once-per-session gate.
     *
     * There was, briefly, and there was also a reduced-motion branch that
     * showed three photographs and stopped. Both are gone, and the second was
     * the more serious mistake: "less motion" is a request about how things
     * move, not an instruction to withhold most of the content, and a reader
     * who had turned animations down at the OS level was being shown a
     * different site. Every path through this component now shows every image.
     *
     * What the preference changes is the profile - see `GENTLE` in
     * `lib/splash-montage.ts`, where nothing is held for less than a fifth of a
     * second and the crossfade is most of the hold, so the sequence is a
     * continuous slow dissolve with no flashing anywhere in it.
     *
     * The lite tier takes the same gentle profile. Its problem is a four-core
     * phone and a metered connection rather than a stated preference, and a
     * slower montage is the answer to both.
     */
    const gentle = prefersReducedMotion || isLite;

    /*
     * Order, then pacing. Both come from the module so they can be driven by a
     * verification script with a virtual clock; the component's own job starts
     * at `show` below and is entirely about layers.
     */
    const order = shuffleOrder(count);
    const beats = planMontage(count, gentle ? GENTLE : CINEMATIC);

    const montageDuration = beats.reduce((total, beat) => total + beat.hold, 0);

    /*
     * The hold.
     *
     * The montage sets it: its own length, plus the finale's beat of stillness
     * on the last photograph. Never below the floor the splash has always had,
     * though - a montage of two images is done in a second, and the arch is
     * still being struck until 1840ms. Leaving on the montage's schedule there
     * would cut the drawing off half-made.
     */
    const minHold = Math.max(
      MIN_VISIBLE_MS,
      Math.round(montageDuration) + FINAL_HOLD_MS,
    );

    /*
     * The ceiling, and why it is so much larger than the hold.
     *
     * The splash does not leave until the montage has shown every photograph,
     * so the ceiling cannot be the montage's planned length plus a moment - it
     * has to be the length of a montage that has gone badly. A sequence running
     * on a busy main thread, waiting on a slow connection, can take half again
     * what it planned to; anything tighter than that starts truncating the
     * sequence, which is the bug this whole arrangement exists to prevent.
     *
     * It is still a ceiling. Beyond it something is wrong enough that the
     * reader is better served by the site than by the introduction to it.
     */
    const maxHold = Math.max(
      MAX_VISIBLE_MS,
      minHold + Math.max(MAX_OVERRUN_MS, Math.round(montageDuration)),
    );

    /*
     * Preloading: everything, immediately, in running order.
     *
     * The tail used to be deferred to `requestIdleCallback`, on the reasoning
     * that three megabytes of photography should not compete with hydration.
     * The reasoning was sound and the consequence was not: a montage whose
     * later frames had not been *asked for* yet spent beats waiting on them,
     * and beats spent waiting are beats the sequence has not budgeted, which is
     * how it came to overrun its own schedule and get cut off.
     *
     * Every one of these images is going to be on screen within a few seconds,
     * so there is no version of this where they are not fetched. Requesting
     * them in running order lets the browser's own six-at-a-time queue do the
     * prioritising - the frames the montage needs first are the ones asked for
     * first - and `fetchPriority="low"` on the markup keeps the whole set
     * behind the document, the fonts and the crest.
     */
    const load = (position: number) => {
      const frame = frames[order[position]];
      if (!frame) return;

      const deferred = frame.dataset.src;
      if (deferred && !frame.getAttribute("src")) frame.src = deferred;
    };

    for (let k = 0; k < count; k += 1) load(k);

    /*
     * A photograph the browser could not fetch at all. It is the only reason a
     * frame is ever dropped from the sequence.
     */
    const broken = new Set<number>();

    frames.forEach((frame, index) => {
      frame.addEventListener(
        "error",
        () => {
          broken.add(index);

          if (process.env.NODE_ENV === "development") {
            // A missing hero image is a content problem worth surfacing while
            // working, and silent in production.
            console.warn(
              `[splash] hero image failed to load: ${frame.currentSrc || frame.dataset.src}`,
            );
          }
        },
        { once: true },
      );
    });

    /**
     * When the montage put its last photograph up, or null while it is still
     * running. The splash's departure is gated on this - see `dismiss`.
     */
    let montageEnded: number | null = null;

    /** Set by `dismiss`; the actual departure waits for the montage. */
    let leaveWhenReady = () => {};

    /** How many photographs have actually been on screen. Reported, not assumed. */
    let displayed = 0;

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[Splash] Frames in DOM: ${count}  Sequence images: ${beats.length}  (planned ${Math.round(montageDuration)}ms, profile ${gentle ? "gentle" : "cinematic"})`,
      );
    }

    /*
     * The two layers that make a dissolve rather than a wash.
     *
     * A crossfade done the obvious way - incoming 0 to 1 while outgoing 1 to 0
     * - passes through a moment where both photographs are half transparent
     * over white, and that moment is visibly pale. So the outgoing frame simply
     * *stays* at full opacity underneath while the incoming one fades in over
     * the top of it, and only drops out once there is another opaque layer
     * above it. The dissolve is clean at every point, and it costs one
     * attribute instead of a second animation.
     *
     * Two layers, N photographs. The layers are how it is drawn; the sequence
     * is how many there are.
     */
    let current = frames[order[0]] ?? null;
    let under: HTMLImageElement | null = null;

    const montage = createMontage({
      order,
      beats,
      isReady: (index) => {
        const frame = frames[index];
        return Boolean(frame?.complete) && frame.naturalWidth > 0;
      },
      isBroken: (index) => broken.has(index),

      onShow: ({ index, position, total, hold, fade }) => {
        const frame = frames[index];

        displayed = position + 1;

        if (frame && frame !== current) {
          /*
           * Set before the attributes move, so the transition about to start is
           * the one this beat asked for and not the last one's.
           *
           * Two durations from the one number. `--splash-fade` is the beat's
           * own crossfade length and is used only on the reduced-motion path,
           * where there is no travel and the dissolve is the whole
           * transition.
           *
           * `--splash-slide` is what everyone else gets, and it is capped.
           * The montage's first holds are over seven hundred milliseconds, so
           * two fifths of one is a near-three-hundred-millisecond move - and
           * a photograph taking a third of a second to cross the screen is a
           * slide, which is the thing this is not meant to look like. Capped
           * at 200ms it is a snap at the top of the sequence and, by the time
           * the cuts are 95ms apart, it is shorter still and has become a
           * hard cut with a direction.
           */
          const slide = Math.min(Math.round(fade), 200);

          reelRef.current?.style.setProperty(
            "--splash-fade",
            `${Math.round(fade)}ms`,
          );

          reelRef.current?.style.setProperty("--splash-slide", `${slide}ms`);

          if (under) delete under.dataset.under;

          if (current) {
            delete current.dataset.active;
            current.dataset.under = "";
            under = current;
          }

          frame.dataset.active = "";
          current = frame;
        }

        // Keep the requests running ahead of the cuts on a slow connection.
        for (let k = position + 1; k <= position + LOOKAHEAD; k += 1) load(k);

        /*
         * The montage comes up as it speeds up. A multiplier on the season's
         * own opacity rather than a replacement for it, so Lent stays dimmer
         * than Easter at every point on the ramp - see the reel section of
         * `globals.css`.
         */
        const through = position / Math.max(1, total - 1);

        reelRef.current?.style.setProperty(
          "--splash-reel-gain",
          `${(0.72 + through * 0.28).toFixed(3)}`,
        );

        /*
         * The bar is the montage's own position, so the two cannot drift: it is
         * how many photographs have been shown, plus how far through the
         * current one we are, over the total. It reaches 100% as the last
         * photograph appears - never before, and never after.
         */
        beatRef.current = {
          shown: position,
          total,
          start: performance.now(),
          hold,
        };
      },

      onComplete: () => {
        /*
         * The end of the montage, not the end of the splash. The bar is
         * released to 100% here and the last photograph is left alone on
         * screen; the finale's beat of stillness is counted from this moment.
         */
        doneRef.current = true;
        montageEnded = performance.now();

        if (process.env.NODE_ENV === "development") {
          console.info(
            `[Splash] Displayed ${displayed} / ${count} images in ${Math.round(montageEnded - start)}ms (planned ${Math.round(montageDuration)}ms)${broken.size > 0 ? `, ${broken.size} failed to load` : ""}.`,
          );
        }

        // If the page was ready long ago, this is what releases it.
        leaveWhenReady();
      },

      schedule: (run, delay) => window.setTimeout(run, delay),
      cancel: (handle) => window.clearTimeout(handle),
    });

    montage.start();

    /* ---------------------------------------------------------------------- */
    /* The bar                                                                */
    /* ---------------------------------------------------------------------- */

    /*
     * The bar reports the montage, and only the montage.
     *
     * It counts photographs: how many have been shown, plus how far through the
     * one currently up, over the total the folder holds. So it starts at zero,
     * moves continuously, is at roughly half way when half the collection has
     * been seen, and arrives at 100% exactly as the last photograph appears -
     * which is what makes the number and the imagery one story rather than two
     * things happening at once on the same screen.
     *
     * It used to blend in how many assets had loaded. That was right when the
     * splash was a second and a half of waiting for web fonts and is wrong now:
     * everything it counted landed inside the first second, so the bar shot to
     * the nineties and sat there while the montage was still running. A bar
     * that stops moving while something is plainly still happening reads as a
     * hang.
     *
     * The web fonts are still waited on - that is what `dismiss` is for - they
     * are simply no longer what the reader is being shown a number for.
     */
    /*
     * The frame is drawn in the pixels it actually occupies.
     *
     * `pathLength` normalises whatever the path measures to 1, so the share
     * of the dash each side gets is decided by its length *in user units*.
     * With a square viewBox stretched over a landscape window that gives the
     * top and the left the same share while the top is twice as long on
     * screen - the line races along the horizontals and crawls down the
     * verticals, and "starts here, finishes here" stops meaning anything in
     * between.
     *
     * So the viewBox is set to the measured box and the path rewritten to
     * match, which makes one user unit one pixel and the traversal even the
     * whole way round. Re-run on resize, because a phone's address bar
     * collapsing mid-splash changes the height by a tenth.
     */
    const gauge = barRef.current;

    const gaugeRects = gauge
      ? Array.from(gauge.querySelectorAll<SVGPathElement>("path[data-rect]"))
      : [];

    /** The last geometry written, so a resize that changes nothing costs nothing. */
    let gaugeBox = "";

    const drawGauge = (width: number, height: number) => {
      if (!gauge || width < 1 || height < 1) return;

      const w = Math.round(width);
      const h = Math.round(height);

      const box = `0 0 ${w} ${h}`;
      if (box === gaugeBox) return;
      gaugeBox = box;

      gauge.setAttribute("viewBox", box);

      /*
       * Top centre, clockwise, and closed. `Z` returns to the start of the
       * subpath rather than drawing a fifth side, so the last thing the fill
       * does at 100% is arrive back at the point it left - which is the
       * whole idea, and is why the path starts mid-edge instead of at a
       * corner where it would be invisible.
       */
      const d = `M${w / 2} 0H${w}V${h}H0V0Z`;
      gaugeRects.forEach((path) => path.setAttribute("d", d));
    };

    /*
     * The observer hands over its own measurement rather than being asked for
     * one.
     *
     * `contentRect` is the box the browser has just finished laying out, so
     * reading it is free; calling `getBoundingClientRect()` inside a resize
     * callback forces the layout it was about to do anyway, and doing that
     * before writing three attributes to the same element is the shape of a
     * resize loop. The frame is `clamp(…vmin…)` on both axes, so a drag on a
     * desktop window fires this on very nearly every frame.
     */
    let gaugeFrame = 0;
    let pending: { width: number; height: number } | null = null;

    const gaugeResize =
      gauge &&
      typeof ResizeObserver === "function" &&
      typeof requestAnimationFrame === "function"
        ? new ResizeObserver((entries) => {
            const rect = entries[entries.length - 1]?.contentRect;
            if (!rect) return;

            pending = { width: rect.width, height: rect.height };

            // Coalesced: a drag delivers a burst of these and only the last
            // one is the size the window ends up at.
            if (gaugeFrame) return;

            gaugeFrame = requestAnimationFrame(() => {
              gaugeFrame = 0;
              if (pending) drawGauge(pending.width, pending.height);
            });
          })
        : null;

    /*
     * Drawn once here, synchronously, and only then observed.
     *
     * The observer does fire on `observe`, but asynchronously - and this one
     * then defers again to the next animation frame, so the first correct
     * geometry landed two frames after mount. For two frames the frame was
     * the placeholder viewBox stretched over the window, which gives every
     * side an equal quarter of the path while the horizontals are twice as
     * long on screen. It is the exact defect the measuring exists to prevent,
     * showing for 30ms at the moment the screen appears.
     *
     * One forced layout, once, at a point where the browser is about to lay
     * out anyway. The observer takes over from here.
     */
    if (gauge) {
      const rect = gauge.getBoundingClientRect();
      drawGauge(rect.width, rect.height);
    }

    gaugeResize?.observe(gauge!);

    let value = 0;
    let frameHandle = 0;
    let shownPercent = -1;

    const paintProgress = () => {
      const beat = beatRef.current;

      /*
       * Interpolated across the current photograph's hold, so the bar moves
       * smoothly between cuts rather than stepping once per image - at the
       * start of a montage a step would be a bar that jumps a fiftieth and then
       * freezes for half a second.
       */
      const within =
        beat.hold > 0
          ? Math.min(1, (performance.now() - beat.start) / beat.hold)
          : 1;

      const reach = Math.max(1, beat.total - 1);
      const byMontage = Math.min(1, (beat.shown + within) / reach);

      /*
       * Capped just short of the end until the montage has actually finished. A
       * full bar over a sequence that is still running is the one thing a
       * progress bar can say that is simply untrue.
       */
      const target = doneRef.current ? 1 : Math.min(0.99, byMontage);

      // Eased rather than snapped, and only ever upward.
      value += (Math.max(value, target) - value) * 0.14;
      if (target - value < 0.004) value = Math.max(value, target);

      if (gauge) gauge.style.setProperty("--splash-progress", `${value}`);

      const percent = Math.round(value * 100);
      if (percent !== shownPercent) {
        shownPercent = percent;
        const readout = countRef.current;
        /*
         * The numerator only. The denominator is a static `100` in the
         * markup, so the frame that changes sixty times a second writes to
         * one text node rather than rebuilding the whole readout - and the
         * two halves can be styled apart, which is what stops "37/100"
         * reading as one number with a stroke through it.
         */
        if (readout) readout.textContent = `${percent}`;
      }

      // Stop at the end rather than ticking a finished bar for the length of
      // the morph.
      if (value >= 1) return;

      frameHandle = requestAnimationFrame(paintProgress);
    };

    frameHandle = requestAnimationFrame(paintProgress);

    /*
     * There is no flight and no morph here any more.
     *
     * The splash used to leave by taking itself apart: the crest was measured
     * against the masthead's own and flown into it, while the white ground was
     * re-seated as the header's pill and scaled down onto it. It worked, it
     * landed on the mark at any viewport, and it was the wrong ending for this
     * screen - a hand-off says "this emblem becomes that one", which is a
     * sentence about the header, not about the parish the montage has just
     * spent seven seconds showing.
     *
     * What replaced it is one transform on one element: the whole panel lifts
     * up and off, carrying the last photograph, the crest and the finished bar
     * with it, and the site is behind it. See the curtain section of
     * `globals.css`. Nothing is measured, so nothing can miss.
     */

    /*
     * Leaving is gated on the montage, not on the clock.
     *
     * This is the correction to the bug that made the whole sequence pointless.
     * The splash used to dismiss at `minHold` - the montage's *planned* length
     * plus the finale - and stop the montage wherever it had got to. But a
     * planned length is not a real one: every beat pays for whatever the main
     * thread is doing when its timer fires, and the fast end of the sequence
     * has holds shorter than that debt. A montage planned at eleven seconds ran
     * closer to eighteen, so the splash left on time with two thirds of the
     * photographs unshown - which looked exactly like a discovery bug and was
     * not one.
     *
     * The rule now is the one the sequence deserves: the splash leaves when the
     * last photograph has been shown *and* held, and when the page behind it is
     * ready. Whichever of those is last decides. `maxHold` remains as the
     * outright ceiling for a montage that has gone wrong.
     */
    let pageReady = false;

    /**
     * The departure itself. Runs once, and only once both gates are open.
     */
    const leave = () => {
      if (settled) return;
      settled = true;

      /*
       * Nothing cuts during the exit. The panel is carrying the montage's last
       * photograph up the screen, and a cut inside a moving frame is a flicker
       * with no reason the reader can see. By now the montage has normally
       * finished on its own; this only bites when the ceiling has fired.
       */
      montage.stop();

      // The curtain itself is CSS - `setPhase` is the whole of the
      // JavaScript's part in it.
      setPhase("leaving");

      /*
       * And the page takes over. This releases the hero's opening lines, which
       * have been held under the curtain; they rise into place while the panel
       * is still crossing, so the two movements read as one. See the hand-over
       * section of `globals.css`.
       */
      root.dataset.splashRevealing = "";

      /*
       * Scroll is handed back as the panel starts to move rather than after it
       * has gone. The page underneath is what the reader is being given, and it
       * should accept a wheel tick from the moment it starts to show.
       */
      root.style.overflow = previousOverflow;

      timers.push(window.setTimeout(() => setPhase("gone"), UNMOUNT_MS));
    };

    /*
     * The two gates.
     *
     * The page has to be ready - fonts resolved, crest decoded - and the
     * montage has to have shown its last photograph and held it for the
     * finale. Whichever finishes last opens the door, so this is called from
     * both sides: from `dismiss` when the page becomes ready, and from the
     * montage's `onComplete`.
     *
     * `MIN_VISIBLE_MS` is still honoured underneath, for the case of a very
     * small collection whose montage is over before the arch has finished being
     * drawn.
     */
    leaveWhenReady = () => {
      if (settled || !pageReady || montageEnded === null) return;

      const elapsed = performance.now() - start;
      const held = performance.now() - montageEnded;

      const wait = Math.max(
        0,
        MIN_VISIBLE_MS - elapsed,
        // The finale: the last photograph, alone and at rest, before the white
        // starts to move.
        FINAL_HOLD_MS - held,
      );

      timers.push(window.setTimeout(leave, wait));
    };

    /**
     * The page is ready. Note what this no longer does: it does not schedule
     * the departure. It records that one of the two gates is open and asks
     * whether the other is.
     */
    const dismiss = () => {
      if (settled || pageReady) return;
      pageReady = true;

      leaveWhenReady();
    };

    /*
     * The crest is the one asset the splash itself depends on, so it is waited
     * on explicitly - fading out to reveal the site while the emblem that was
     * meant to introduce it is still blank would be a worse first impression
     * than a slightly longer hold.
     */
    const crest = crestRef.current;

    const crestReady =
      crest?.complete === true
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            if (!crest) {
              resolve();
              return;
            }

            crest.addEventListener("load", () => resolve(), { once: true });
            // A missing crest must not hold the curtain shut.
            crest.addEventListener("error", () => resolve(), { once: true });
          });

    /*
     * Start the exit in a gap, not on top of hydration.
     *
     * Readiness normally lands while React is still hydrating the header, the
     * hero and the menus, and the main thread is the scarcest thing on the page
     * at that moment. Beginning a morph and a flight into that contention is
     * how the first frame gets dropped on modest hardware - and the first frame
     * is the one the eye is most likely to catch.
     *
     * `requestIdleCallback` waits for the thread to come up for air, and the
     * timeout is the promise that it cannot wait indefinitely: if nothing ever
     * goes idle, the exit runs anyway. The minimum-hold arithmetic inside
     * `dismiss` absorbs whatever this costs, so on a warm cache the sequence
     * looks the same either way.
     */
    const dismissWhenIdle = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => dismiss(), { timeout: 500 });
        return;
      }

      dismiss();
    };

    void Promise.all([document.fonts.ready, crestReady])
      // One more frame so the fonts that just resolved are actually painted
      // behind us, rather than swapping in as the curtain opens on them.
      .then(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          ),
      )
      .then(dismissWhenIdle, dismissWhenIdle);

    /*
     * The ceiling is a ceiling: it does not wait for idle, and it does not wait
     * for the montage either. It calls `leave` directly rather than `dismiss`,
     * because `dismiss` only opens a gate - and the whole point of this timer is
     * the case where the other gate is never going to open.
     */
    timers.push(window.setTimeout(leave, maxHold));

    return () => {
      timers.forEach(window.clearTimeout);
      montage.stop();
      cancelAnimationFrame(frameHandle);
      gaugeResize?.disconnect();
      if (gaugeFrame) cancelAnimationFrame(gaugeFrame);

      release();
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <>
      {/*
        The lit edge, and the reason it is a sibling rather than a child.

        `.splash-shell` carries `contain: paint` - the promise that lets the
        browser skip the rest of the document while the montage plays - and
        paint containment clips anything drawn outside the card's own box,
        which is exactly where a cast shadow goes. So the edge is given the
        card's geometry and the card's own keyframes, one layer below it. It
        cannot drift out of register, because it is not following the card:
        it is doing the same thing from the same clock.

        On this screen it is not decoration. Both sides of the join are dark
        photography under the same grade, so without a hairline of gilt along
        the boundary and a shadow under it, a 700ms lift is a dark rectangle
        crossing a dark rectangle - motion the reader can see and cannot
        read. It is inert until the departure, and carries the phase so the
        CSS can hold it at nothing for the seven seconds before.
      */}
      <span aria-hidden className="splash-edge" data-phase={phase} />

      <div
        /*
         * `fixed` rather than `absolute` so it stays over the viewport if the
         * reader manages a scroll in the moments before hydration; `touch-action`
         * and `overscroll-behavior` stop a swipe in that same window from
         * dragging the page underneath, which is the case JS is not yet there to
         * catch.
         */
        className="splash-shell fixed inset-0 z-[200] flex touch-none flex-col items-center justify-center gap-7 overflow-hidden overscroll-contain"
        data-phase={phase}
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{t("loading")}</span>

        {/* The white field */}
        <span aria-hidden ref={groundRef} className="splash-ground" />

        {/*
          The reel: the site's own hero photography, cut fast behind the white.

          Not a slideshow. Every frame is up at once and all but one are held at
          zero opacity, so a change of still is a hard cut with no crossfade
          anywhere in it - a dissolve between two photographs is the language of
          a gallery, and this is meant to read as a projector running up to
          speed. The white ground stays underneath and the whole layer is washed
          back into it, so what the reader sees is the parish showing *through*
          the opening frame rather than a photograph with a logo on top.

          Only the first still has a `src` here. The others are given theirs at
          runtime, and only on hardware that can afford them - see the reel
          section of the effect above.
        */}
        {reel.length > 0 ? (
          <span aria-hidden ref={reelRef} className="splash-reel">
            {reel.map((src, i) => (
              /* eslint-disable-next-line @next/next/no-img-element -- must be in the first paint, and `next/image` cannot be given a src at runtime. */
              <img
                key={src}
                src={i === 0 ? src : undefined}
                data-src={i === 0 ? undefined : src}
                data-active={i === 0 ? "" : undefined}
                alt=""
                decoding="async"
                /* Behind the crest in every sense: the emblem is what this
                   screen is for, and it must not queue behind six photographs. */
                fetchPriority="low"
                className="splash-frame"
              />
            ))}
          </span>
        ) : null}

        {/*
          The grade: a scrim weighted to the foot and a vignette closing the
          corners, the same treatment the hero puts over its own frames.

          Its own layer rather than part of the reel, and over the reel rather
          than under it. Everything below this line in the markup is read
          against it - the seal, the arch, the church's name, the leader - and
          what it is protecting them from is the montage itself: fifty-four
          photographs go past behind them, and without this the emblem lands on
          a different backdrop every few hundred milliseconds and half of them
          fight it.
        */}
        <span aria-hidden className="splash-grade" />

        {/*
          The frame, and the progress.

          A border ruled a finger's width in from the edges of the window,
          which begins at its top centre, travels the whole perimeter
          clockwise, and closes on the point it started from as the montage
          shows its last photograph.

          It has been in three places. A hairline along the foot was accurate
          and a whole viewport away from the emblem everyone was looking at; a
          small square around the seal put it where the attention was and made
          a third concentric figure inside an arch that already had two. This
          one stops competing with anything, because it is not an element on
          the screen - it is the screen's own border, and the load is reported
          by that border being drawn.

          The same technique as the arch: `pathLength={1}` normalises the
          outline to a single unit whatever its real length is, so
          `stroke-dashoffset: calc(1 - var(--splash-progress))` is the whole of
          the mechanism, driven by the one property the frame loop already
          writes. No layout, no React render, nothing on the main thread.

          `preserveAspectRatio="none"` and a placeholder `viewBox`: the effect
          replaces both with the measured box - see `drawGauge` - so the path
          is in real pixels. Without that the horizontals and the verticals get
          the same share of the path while the horizontals are visibly twice as
          long, and the line races along the top and crawls down the sides.

          The `span` around it is load-bearing, not a wrapper for its own
          sake: an `<svg>` is a replaced element and will not stretch to four
          offsets - it takes the `viewBox`'s ratio instead, which made this
          frame a square as tall as the window is wide and put its bottom rule
          hundreds of pixels below the screen. See the note in `globals.css`.
        */}
        <span aria-hidden className="splash-gauge-box">
          <svg
            ref={barRef}
            className="splash-gauge"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              data-rect
              className="gauge-track"
              pathLength={1}
              d="M50 0H100V100H0V0Z"
            />
            <path
              data-rect
              className="gauge-fill"
              pathLength={1}
              d="M50 0H100V100H0V0Z"
            />
          </svg>
        </span>

        {/* A slow warm bloom, so the plate has a centre rather than reading as
            an evenly lit rectangle. */}
        <span aria-hidden className="splash-halo" />

        {/* The site's own gilded motes, drifting behind the arch - dust caught in
            window light. `z-0` overrides the component's own `-z-10`, which would
            otherwise put them behind the white ground. */}
        {/* The crest, set in the arch - and the one element here that does not
            leave, but flies. */}
        <span aria-hidden className="splash-crest">
          {/*
           * The arch.
           *
           * Two jambs and a true semicircle struck between them, radius 100
           * about (100,160) - a round Romanesque head, not a Gothic point. That
           * is the faithful choice: the arch over St. Mark's own altar is round,
           * and a lancet here would have been a prettier drawing of a different
           * church.
           *
           * Inside this wrapper rather than beside it, so it centres on the
           * crest with no arithmetic - and so it stays where it was struck when
           * the crest flies out of it, because the flight is on the image.
           *
           * `pathLength={1000}` normalises the outline to a thousand units
           * whatever its real length is, so the one dash pair in `globals.css`
           * draws it and stays right if this geometry is ever retuned.
           */}
          <svg className="splash-arch" viewBox="-6 54 212 252" fill="none">
            {/*
              The same outline twice: a wide, nearly transparent stroke beneath
              a hairline, both drawn by the same dash offset at the same time.

              That is the glow, and it is drawn this way rather than with
              `filter: drop-shadow()` because a filter on an element whose
              geometry is animating re-rasters the whole box on every frame of
              the fourteen hundred milliseconds it takes to strike - on the main
              thread, during hydration. Two strokes cost one extra path; the
              filter costs a repaint per frame.
            */}
            <path
              className="arch-glow"
              pathLength={1000}
              d="M0 300V160a100 100 0 0 1 200 0v140"
            />
            <path
              className="arch-line"
              pathLength={1000}
              d="M0 300V160a100 100 0 0 1 200 0v140"
            />

            {/* The keystone at the crown, then the two springing points - the
                three places an arch is actually made. */}
            <circle cx="100" cy="60" r="0" />
            <circle cx="0" cy="160" r="0" />
            <circle cx="200" cy="160" r="0" />
          </svg>

          {/* The seal's own border, opening outward as the crest is released.
              Ordered before the image so the rings spread from behind it. */}
          <span className="splash-rings" />

          {/*
            The mount.

            The emblem is supplied as a white disc. On the old white field that
            was free; on a photograph it is a hard circle of paper pasted over
            whatever the montage is showing, and it read as a sticker. The fix
            is not to cut the disc out - it is to admit it and set it, so the
            white reads as the ground of a seal struck into the arch, which is
            what it is. A hairline of the season's gilt at the rim, a ring of
            ink outside it, and a shadow so the thing has a plane of its own.

            Behind the image, not around it: the file is square with transparent
            corners, so a border on the `img` would draw a square around a
            circle.
          */}
          <span aria-hidden className="splash-seal" />

          {/*
           * A plain `img`, not `next/image`. The crest has to be in the first
           * paint of a static document, and this is one 512px file at a fixed
           * size with nothing for the optimizer to decide - `next/image` would
           * add a wrapper and a srcset to reach the same pixels.
           *
           * It is a raster reduction of `public/Logo1.svg` rather than the SVG
           * itself: that file is an emblem traced over an embedded bitmap and
           * weighs 1.4 MB, which is a strange thing to make a reader download
           * before they are allowed to see the page. See `scripts/build-splash-logo.mjs`.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element -- see above: fixed size, already optimised, must be in the first paint. */}
          <img
            ref={crestRef}
            src="/splash-logo.webp"
            alt=""
            width={512}
            height={512}
            fetchPriority="high"
            /*
             * `async`, not `sync`. A synchronous decode blocks the main thread
             * until the bitmap is ready, which on a slow CPU is a dropped frame
             * during hydration - and it buys nothing here, because the dismissal
             * already waits on this image's `load` before it will let the splash
             * go. The crest is guaranteed to be up long before it is needed.
             */
            decoding="async"
            /*
             * No drop shadow on the emblem itself any more. `.splash-seal`
             * behind it is the same size and carries the rim, the ring of ink
             * and the cast shadow, so this one was drawing a second shadow
             * inside the disc where nothing could see it - and paying for it
             * twice over during the exit, where a `filter` on an element whose
             * `scale` is animating re-rasters the box on every frame.
             */
            className="size-24 object-contain sm:size-28"
          />
        </span>

        {/*
          No wordmark here.

          The parish's name was set under the seal for a while and has been
          taken out again. The screen is the emblem in the arch over the
          parish's own photography, and it is the only screen on the site whose
          whole job is to be looked at rather than read - a line of type in the
          middle of it turns a title card into a title *slide*, and the name is
          on the masthead the dissolve is about to hand over to anyway.

          The effect no longer waits on anything to release type, either: with
          nothing set on this screen, `document.fonts.ready` is once again only
          a gate on the departure rather than something the reader can see the
          result of.
        */}

        {/*
          The count, set under the seal rather than in the corner.

          It was in the corner, over the leader, which is where a projector puts
          a frame counter and which is also where nobody looks. The centre of
          this screen is the only place the reader's eye actually rests - the
          arch and the emblem hold it there for seven seconds - so the one
          piece of information the screen has to give belongs in the same
          column, directly beneath the seal and inside the arch's own opening.

          Counted, not measured: how many hundredths of the montage have been
          shown, over the hundred there are. A percent sign is a unit and reads
          as a machine reporting on itself; a fraction reads as a position in
          something with a known end - the same statement the leader along the
          foot is making, in the one form that also says how much is left.

          The denominator is static markup and only the numerator is written at
          runtime, so the frame that runs sixty times a second touches one text
          node.
        */}
        <span aria-hidden className="splash-count">
          <span ref={countRef} className="splash-count-now">
            0
          </span>
          <span className="splash-count-of">/100</span>
        </span>

        {/*
          There is no bar along the foot of the frame any more.

          It reported the montage honestly and it reported it at the far end
          of the screen from the emblem, the arch and the count - four things
          saying one thing, in two places. The square gauge around the seal
          says it where the reader is already looking, so the hairline was
          repetition with a full viewport between it and everything it agreed
          with.
        */}

        {/*
          The season's own figures, standing along the foot of the opening frame -
          the same firs, bare branches, crosses and lilies that line every section
          of the site, so the splash belongs to the year the page behind it is
          keeping.

          Every set is rendered and all but one is hidden by CSS. That looks
          wasteful and is the only thing that works here: the season is written to
          the root element by the bootstrap script *before first paint*, but React
          does not re-render this component until hydration - which on this page
          is exactly the moment the splash is leaving. Choosing the set in
          JavaScript would mean choosing it too late to be seen, which is the bug
          this whole arrangement exists to avoid. Rendering all five and letting a
          CSS attribute selector pick costs a few hundred bytes of markup and is
          correct on the first frame.
        */}
        {/*
          And the same again at the head of the frame.

          The site's grammar for this is already settled: things *hang* from the
          head of a section and *stand* at its foot. The splash follows it rather
          than inventing a second arrangement - baubles and stars in December,
          veils through Lent, the crown of thorns in Holy Week and on Good Friday,
          and at Easter the light itself.

          Nothing is mirrored to fill the top. A standing figure flipped upside
          down is a cheap way to fill a row and, for three of these five seasons,
          an inverted cross - which is not a thing to put on a church's opening
          screen by accident.
        */}
        <span aria-hidden className="splash-flora splash-flora-top" data-for="christmas">
          <Bauble drop={10} className="w-4 sm:w-5" />
          <HangingStar drop={22} className="w-4 sm:w-5" />
          <Bauble drop={34} className="w-4 sm:w-5" />
          <HangingStar drop={14} className="w-4 sm:w-5" />
          <Bauble drop={26} className="w-4 sm:w-5" />
          <HangingStar drop={38} className="w-4 sm:w-5" />
          <Bauble drop={18} className="w-4 sm:w-5" />
          <HangingStar drop={30} className="w-4 sm:w-5" />
        </span>

        <span aria-hidden className="splash-flora splash-flora-top" data-for="lent">
          <Veil drop={14} className="w-4 sm:w-5" />
          <Veil drop={30} className="w-4 sm:w-5" />
          <Veil drop={20} className="w-4 sm:w-5" />
          <Veil drop={36} className="w-4 sm:w-5" />
          <Veil drop={16} className="w-4 sm:w-5" />
        </span>

        <span aria-hidden className="splash-flora splash-flora-top" data-for="holy-week">
          <Veil drop={18} className="w-4 sm:w-5" />
          <Thorns drop={12} className="w-6 sm:w-7" />
          <Veil drop={32} className="w-4 sm:w-5" />
          <Thorns drop={26} className="w-6 sm:w-7" />
          <Veil drop={16} className="w-4 sm:w-5" />
        </span>

        <span aria-hidden className="splash-flora splash-flora-top" data-for="good-friday">
          <Thorns drop={14} className="w-6 sm:w-7" />
          <Thorns drop={30} className="w-6 sm:w-7" />
          <Thorns drop={20} className="w-6 sm:w-7" />
          <Thorns drop={34} className="w-6 sm:w-7" />
        </span>

        {/* Easter hangs light rather than an object - the season's decoration is
            the light, exactly as it is in the sections. */}
        <span aria-hidden className="splash-flora splash-flora-top" data-for="easter">
          <span className="splash-ray" style={{ height: "34%" }} />
          <span className="splash-ray" style={{ height: "58%" }} />
          <span className="splash-ray" style={{ height: "42%" }} />
          <span className="splash-ray" style={{ height: "66%" }} />
          <span className="splash-ray" style={{ height: "38%" }} />
          <span className="splash-ray" style={{ height: "52%" }} />
        </span>

        <span aria-hidden className="splash-flora" data-for="christmas">
          <Tree className="h-[64%] w-auto" />
          <Gift className="h-[22%] w-auto" />
          <Tree className="h-[88%] w-auto" />
          <Candle className="h-[46%] w-auto" />
          <Tree className="h-full w-auto" />
          <Bell className="h-[32%] w-auto" />
          <Tree className="h-[76%] w-auto" />
          <CandyCane className="h-[38%] w-auto" />
          <Holly className="h-[22%] w-auto" />
          <Tree className="h-[58%] w-auto" />
          <Wreath className="h-[34%] w-auto" />
          <Tree className="h-[70%] w-auto" />
        </span>

        <span aria-hidden className="splash-flora" data-for="ash-wednesday">
          <PalmFrond className="h-[62%] w-auto" />
          <AshCross className="h-[44%] w-auto" />
          <AshBowl className="h-[34%] w-auto" />
          <AshCross className="h-[38%] w-auto" />
          <PalmFrond className="h-[54%] w-auto" />
        </span>

        <span aria-hidden className="splash-flora splash-flora-top" data-for="ash-wednesday">
          <Veil drop={16} className="w-4 sm:w-5" />
          <Veil drop={30} className="w-4 sm:w-5" />
          <Veil drop={20} className="w-4 sm:w-5" />
        </span>

        <span aria-hidden className="splash-flora" data-for="lent">
          <Stone className="h-[10%] w-auto" />
          <BareTree className="h-[68%] w-auto" />
          <Stone className="h-[8%] w-auto" />
          <BareTree className="h-full w-auto" />
          <Stone className="h-[11%] w-auto" />
          <BareTree className="h-[74%] w-auto" />
          <Stone className="h-[9%] w-auto" />
          <BareTree className="h-[56%] w-auto" />
        </span>

        <span aria-hidden className="splash-flora" data-for="holy-week">
          <Stone className="h-[9%] w-auto" />
          <BareTree className="h-[62%] w-auto" />
          <Calvary className="h-[82%] w-auto" />
          <Stone className="h-[11%] w-auto" />
          <Calvary className="h-full w-auto" />
          <BareTree className="h-[70%] w-auto" />
          <Stone className="h-[8%] w-auto" />
          <BareTree className="h-[52%] w-auto" />
        </span>

        <span aria-hidden className="splash-flora" data-for="good-friday">
          <Stone className="h-[10%] w-auto" />
          <Calvary className="h-[68%] w-auto" />
          <Stone className="h-[8%] w-auto" />
          <Calvary className="h-full w-auto" />
          <Stone className="h-[9%] w-auto" />
          <Calvary className="h-[68%] w-auto" />
          <Stone className="h-[11%] w-auto" />
        </span>

        <span aria-hidden className="splash-flora" data-for="easter">
          <Lily className="h-[58%] w-auto" />
          <Butterfly className="h-[26%] w-auto" />
          <Lily className="h-[74%] w-auto" />
          <EmptyCross className="h-full w-auto" />
          <Lily className="h-[80%] w-auto" />
          <Butterfly className="h-[22%] w-auto" />
          <Lily className="h-[62%] w-auto" />
          <Stone className="h-[8%] w-auto" />
        </span>
      </div>
    </>
  );
}
