"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { SanctuaryMotes } from "@/components/common/ornament";

/**
 * The opening frame: the parish crest set in a drawn arch on white, held while
 * the document finishes becoming the site.
 *
 * Marked `"use client"` for its dismissal effect, but it is still rendered on
 * the server, so the overlay is present in the very first bytes of HTML — it
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
 * hero photography — several megabytes with its own fade-in — and would leave
 * the crest sitting there long after the site behind it was ready to be read.
 *
 * It does not fade out. It morphs: the white field closes down onto the
 * masthead's floating pill and becomes it, while the crest flies into that
 * pill's logo slot. Both are measured from the live DOM, so both land on the
 * mark at whatever the viewport is. See the morph section of `globals.css` for
 * the timeline the constants below are keyed to.
 */

/**
 * Held at least this long: the arch finishes drawing at 1520ms and its
 * springing points land at 1840ms.
 *
 * Long for a splash, and deliberately so — the arch is meant to be watched
 * being struck, and cutting it off half-drawn would be worse than not drawing
 * it. The floor only bites on a warm cache; a first visit is normally still
 * waiting on fonts well past it, so this is not time added to a real load, it
 * is time the sequence would have had anyway being used rather than wasted.
 */
const MIN_VISIBLE_MS = 1900;

/**
 * Hard ceiling. Whatever we are waiting for, the site is server-rendered and
 * readable — after this we get out of the way and let it finish arriving in
 * the open.
 */
const MAX_VISIBLE_MS = 3600;

/** The crest's flight to the masthead, behind a 40ms lead-in. */
const FLIGHT_MS = 800;

/** The white ground closing onto the pill, behind a 120ms lead-in. */
const MORPH_MS = 760;

/**
 * When the overlay is unmounted: after the ground has landed on the pill and
 * had its 240ms fade, which `globals.css` starts at 900ms.
 */
const FADE_MS = 1180;

/**
 * When the masthead gets its own crest back — while the white ground is still
 * covering that corner, so it is never seen arriving.
 */
const HANDOFF_MS = 900;

export function SplashScreen() {
  const t = useTranslations("common");

  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");
  const crestRef = useRef<HTMLImageElement>(null);
  const groundRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const start = performance.now();
    const timers: number[] = [];

    let settled = false;

    /*
     * The scroll lock is owned entirely by this effect — set when it runs,
     * released when it dismisses. That is the point: a document whose JS never
     * arrives never gets locked in the first place, and the CSS failsafe on
     * `.splash-shell` lifts the curtain without us. A lock rendered into the
     * server HTML instead would have no way back out in that case, and would
     * hand the reader a page they could see but not scroll.
     */
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "clip";

    const release = () => {
      root.style.overflow = previousOverflow;
      delete root.dataset.splash;
      delete root.dataset.splashLite;
    };

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /*
     * The lite tier.
     *
     * Three of the things on this screen loop forever while it is up — the
     * bloom breathing, six motes drifting, the rule sweeping. Each is one
     * composited layer being ticked every frame, which is nothing on a laptop
     * and is not nothing on a four-core phone that is also hydrating a React
     * tree. They are the first things to go, because they are the only things
     * here that are purely decorative: the arch still draws, the crest still
     * flies, the morph still lands.
     *
     * `hardwareConcurrency` is a blunt signal and the only broadly supported
     * one — there is no media query for "this device is slow". Four or fewer
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

    /*
     * The hand-off: fly the splash crest onto the header's crest.
     *
     * This is the whole reason the splash reads as part of the site rather
     * than as a screen in front of it — it is the same emblem, from the same
     * file, and it ends the sequence by becoming the one in the masthead.
     *
     * Measured rather than authored. Both boxes are read at the moment of
     * dismissal, so the flight lands on the mark at whatever the viewport is,
     * with whatever the header's responsive sizing and the wordmark's
     * truncation have done to it. A hand-off that lands near the target reads
     * as a bug; there is no version of this worth shipping that guesses.
     *
     * Returns whether it actually flew — the caller has to know, because the
     * masthead's own crest is being held down for the duration and must not be
     * held down if nothing is coming to replace it.
     */
    const flyCrestToMasthead = (): boolean => {
      if (prefersReducedMotion) return false;

      const crest = crestRef.current;
      const target = document.querySelector<HTMLElement>(
        "[data-site-header] [data-header-crest]",
      );

      // No header on this page, or a browser without WAAPI. Either way the
      // ground still dissolves; it simply does so without the flourish.
      if (!crest || !target || typeof crest.animate !== "function") return false;

      /*
       * Settle the entrance before measuring.
       *
       * The wrapper rises over 900ms and holds `transform` with `fill: both`.
       * If readiness lands while that is still playing, the box measured here
       * is a box mid-rise — and since the wrapper's transform composes with
       * the image's own, the flight would be computed from a position the
       * crest is about to leave and would miss the masthead by whatever was
       * left of the rise. `finish()` jumps it to its resting state, which is
       * identity, so the measurement is of where the crest actually is.
       */
      for (const animation of crest.parentElement?.getAnimations() ?? []) {
        // An infinite animation has no end to jump to and throws if asked for
        // one; nothing on the wrapper is infinite, but this is cheap.
        try {
          animation.finish();
        } catch {
          /* Not finishable; it is not holding the transform either. */
        }
      }

      const from = crest.getBoundingClientRect();
      const to = target.getBoundingClientRect();

      // A header laid out to zero width means it has not been through layout
      // yet, and dividing by `from.width` below would hand back an infinity.
      if (!from.width || !to.width) return false;

      /*
       * Centre-to-centre, then scale. Transforms scale about the element's own
       * centre by default, so matching the centres and then the size is the
       * whole of the arithmetic — no transform-origin games, and it stays
       * correct if either box changes size between now and the next viewport.
       */
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const scale = to.width / from.width;

      crest.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)" },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
          },
        ],
        {
          duration: FLIGHT_MS,
          delay: 40,
          // The site's own `--ease-out-expo`. It leaves quickly and arrives
          // slowly, which is what makes a small target land softly instead of
          // snapping into place.
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        },
      );

      return true;
    };

    /*
     * The morph: close the white field down onto the masthead's pill.
     *
     * This is the piece that makes the splash *become* the header rather than
     * get out of its way. The field the reader has been looking at ends up as
     * exactly the box and exactly the radius of the floating pill in the
     * masthead — so the white does not leave the screen, it arrives somewhere.
     * The dark hero is uncovered by the closing rather than faded in behind it,
     * which is why no frame in this sequence is ever two things at once.
     *
     * Done by scaling a pill, not by clipping a rectangle.
     *
     * Clipping was the first implementation and the obvious one: animate
     * `clip-path` from the viewport inward to the pill's `inset()`. It is also
     * the expensive one — Chrome composites `transform`, `opacity`, `filter`
     * and `backdrop-filter`, and nothing else. `clip-path` is a paint property,
     * so every frame repainted the full viewport on the main thread, during
     * hydration, on whatever hardware the reader has. That is precisely where a
     * splash cannot afford to spend anything.
     *
     * So instead: re-seat this element as the pill itself, pre-scaled by enough
     * to still cover the viewport, and animate that scale to 1. The swap is
     * invisible — a stadium scaled ~25x has straight edges running well past
     * every viewport edge and its rounded ends far off-screen, so before and
     * after are both "the screen is white" — and what is left is one composited
     * transform. The rasterised texture stays the pill's own size, a few
     * thousand pixels, however large it is drawn.
     */
    const morphGroundToMasthead = (ground: HTMLElement | null): boolean => {
      if (prefersReducedMotion || !ground) return false;

      const pill = document.querySelector<HTMLElement>(
        "[data-site-header] [data-header-pill]",
      );

      if (!pill || typeof ground.animate !== "function") return false;

      const box = pill.getBoundingClientRect();

      if (!box.width || !box.height) return false;

      /*
       * The pill is `rounded-full`, a radius far larger than the shape, which
       * the browser clamps to half the short side. Clamping it here too means
       * the element really is a stadium — the shape the reader can see — rather
       * than a rectangle carrying a number that only resolves at paint.
       */
      const radius = Math.min(box.width, box.height) / 2;

      const centreX = box.left + box.width / 2;
      const centreY = box.top + box.height / 2;

      /*
       * The scale that still covers the viewport, measured from the pill's own
       * centre because that is what `transform` scales about. Each axis needs
       * to reach whichever of its two edges is further away; the larger of the
       * two wins, and a little over so that no rounding leaves a hairline of
       * the page showing along an edge.
       */
      const scale =
        Math.max(
          Math.max(centreX, window.innerWidth - centreX) / (box.width / 2),
          Math.max(centreY, window.innerHeight - centreY) / (box.height / 2),
        ) * 1.06;

      /*
       * Re-seat the field as the pill, pre-scaled to cover what it was covering
       * a frame ago. `inset` is cleared first: it is what is holding this
       * element full-bleed, and a stale `right`/`bottom` would fight the
       * explicit width and height.
       */
      ground.style.inset = "auto";
      ground.style.top = `${box.top}px`;
      ground.style.left = `${box.left}px`;
      ground.style.width = `${box.width}px`;
      ground.style.height = `${box.height}px`;
      ground.style.borderRadius = `${radius}px`;
      ground.style.transform = `scale(${scale})`;

      ground.animate(
        [{ transform: `scale(${scale})` }, { transform: "scale(1)" }],
        {
          duration: MORPH_MS,
          delay: 120,
          // Matches the crest's flight, so the two read as one movement with
          // two parts rather than as two animations that happen to overlap.
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        },
      );

      return true;
    };

    const dismiss = () => {
      if (settled) return;
      settled = true;

      // Whatever readiness cost us, top it up to the minimum hold.
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - start));

      timers.push(
        window.setTimeout(() => {
          const flying = flyCrestToMasthead();
          morphGroundToMasthead(groundRef.current);

          /*
           * The root attribute holds the masthead's own crest down while its
           * counterpart is in the air — two of the same emblem on screen at
           * once is the one detail that would give the trick away. Set only
           * when something is actually flying, so a reader on reduced motion,
           * or one whose JS never arrived, never has a crest hidden with
           * nothing coming to replace it.
           */
          if (flying) root.dataset.splash = "leaving";

          setPhase("leaving");

          // Scroll is handed back with the fade, not after it: the page
          // underneath is what the reader is being given, and it should accept
          // a wheel tick from the moment it starts to show through.
          root.style.overflow = previousOverflow;

          timers.push(window.setTimeout(() => setPhase("gone"), FADE_MS));

          if (flying) {
            // The masthead takes its crest back just after the flight lands,
            // underneath one that is by then exactly on top of it.
            timers.push(
              window.setTimeout(() => delete root.dataset.splash, HANDOFF_MS),
            );
          }
        }, remaining),
      );
    };

    /*
     * The crest is the one asset the splash itself depends on, so it is waited
     * on explicitly — fading out to reveal the site while the emblem that was
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
     * how the first frame gets dropped on modest hardware — and the first frame
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

    // The ceiling is a ceiling: it does not wait for idle, because the whole
    // point of it is the case where the thread never gets there.
    timers.push(window.setTimeout(dismiss, MAX_VISIBLE_MS));

    return () => {
      timers.forEach(window.clearTimeout);
      release();
    };
  }, []);

  if (phase === "gone") return null;

  return (
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

      {/* The white field, and the thing that morphs: this is what closes down
          onto the masthead's pill. Separate from the shell because it is
          clipped and the crest flying out across it must not be. */}
      <span aria-hidden ref={groundRef} className="splash-ground" />

      {/* A slow warm bloom, so the white has a centre rather than reading as a
          blank screen the site failed to fill. */}
      <span aria-hidden className="splash-halo" />

      {/* The site's own gilded motes, drifting behind the arch — dust caught in
          window light. `z-0` overrides the component's own `-z-10`, which would
          otherwise put them behind the white ground. */}
      <SanctuaryMotes tone="default" className="z-0" />

      {/* The crest, set in the arch — and the one element here that does not
          leave, but flies. */}
      <span aria-hidden className="splash-crest">
        {/*
         * The arch.
         *
         * Two jambs and a true semicircle struck between them, radius 100
         * about (100,160) — a round Romanesque head, not a Gothic point. That
         * is the faithful choice: the arch over St. Mark's own altar is round,
         * and a lancet here would have been a prettier drawing of a different
         * church.
         *
         * Inside this wrapper rather than beside it, so it centres on the
         * crest with no arithmetic — and so it stays where it was struck when
         * the crest flies out of it, because the flight is on the image.
         *
         * `pathLength={1000}` normalises the outline to a thousand units
         * whatever its real length is, so the one dash pair in `globals.css`
         * draws it and stays right if this geometry is ever retuned.
         */}
        <svg className="splash-arch" viewBox="-6 54 212 252" fill="none">
          <path pathLength={1000} d="M0 300V160a100 100 0 0 1 200 0v140" />

          {/* The keystone at the crown, then the two springing points — the
              three places an arch is actually made. */}
          <circle cx="100" cy="60" r="0" />
          <circle cx="0" cy="160" r="0" />
          <circle cx="200" cy="160" r="0" />
        </svg>

        {/* The seal's own border, opening outward as the crest leaves. Ordered
            before the image so the rings spread from behind it. */}
        <span className="splash-rings" />

        {/*
         * A plain `img`, not `next/image`. The crest has to be in the first
         * paint of a static document, and this is one 512px file at a fixed
         * size with nothing for the optimizer to decide — `next/image` would
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
           * during hydration — and it buys nothing here, because the dismissal
           * already waits on this image's `load` before it will let the splash
           * go. The crest is guaranteed to be up long before it is needed.
           */
          decoding="async"
          /* A real drop shadow, not the hairline one: the crest reads as being
             set in the arch rather than drawn on the same plane as it. */
          className="size-24 object-contain drop-shadow-md sm:size-28"
        />
      </span>

      {/* The same hairline the route-level `loading.tsx` uses, swept rather
          than pulsed — this one is covering a known, finite wait. */}
      <span aria-hidden className="splash-rule" />
    </div>
  );
}
