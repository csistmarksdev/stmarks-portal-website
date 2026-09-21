"use client";

import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { usePathname } from "@/i18n/navigation";

interface LenisContextValue {
  /**
   * Sends the page back to the very top, through Lenis when it is driving.
   *
   * Calling `window.scrollTo` directly would set the native offset behind
   * Lenis's back; Lenis would keep its own target and drag the page straight
   * back on the next wheel tick. Routing through the instance keeps one owner
   * of the scroll position.
   */
  scrollToTop: () => void;
  /**
   * Scrolls to an element by fragment (`"#about"` or `"about"`).
   *
   * Content clears the fixed header; a chapter that opens on a full-bleed hero
   * lands flush against the top of the viewport, because that is where it
   * belongs. Returns false when nothing on the page carries that id, so the
   * caller can let the browser have the click instead.
   */
  scrollToHash: (hash: string, options?: { immediate?: boolean }) => boolean;
}

const LenisContext = createContext<LenisContextValue | null>(null);

/** Breathing room between the header's underside and the section it lands on. */
const ANCHOR_GAP = 16;

/**
 * How far down the viewport an anchored section has to start.
 *
 * Measured rather than read from `--header-height`, because the header is a
 * floating pill with its own padding above it - the custom property is the bar,
 * not the space the bar occupies. Falls back to the property when the header is
 * not in the document, which is the chrome-less error boundary's case.
 */
function headerOffset(): number {
  const header = document.querySelector<HTMLElement>("[data-site-header]");

  if (header) return header.getBoundingClientRect().height + ANCHOR_GAP;

  const declared = getComputedStyle(document.documentElement).getPropertyValue(
    "--header-height",
  );

  return (parseFloat(declared) || 3.75) * 16 + ANCHOR_GAP;
}

/**
 * Whether an anchor target opens with a full-bleed hero.
 *
 * Walks the first-element-child chain rather than searching the subtree: every
 * chapter *contains* a hero, but only a chapter whose very first thing is one
 * should be scrolled flush. `#history` sits inside the About chapter and must
 * still clear the bar; `#about` is the chapter itself and must not.
 *
 * The chain is two or three deep - `#about` to the pinned hero's outer block to
 * its `<section data-hero-frame>` - and terminates on its own at a leaf, so the
 * cap is only there to keep a malformed tree from walking a long list.
 */
function opensWithHero(target: Element): boolean {
  let node: Element | null = target;

  for (let depth = 0; node && depth < 6; depth += 1) {
    if (node.matches("[data-hero-frame]")) return true;
    node = node.firstElementChild;
  }

  return false;
}

/**
 * Smooth scrolling, and the site's anchor navigation.
 *
 * Lenis drives `window.scrollY` itself, so the cinematic hero's scroll
 * listener keeps working unchanged - it still reads real scroll positions.
 *
 * Disabled entirely when the user prefers reduced motion, and on touch
 * devices, where native momentum scrolling feels better than an emulated one.
 *
 * It also owns fragment navigation, and has to: the site is one page, so the
 * menu is now a list of anchors, and a native anchor jump sets the scroll
 * offset behind Lenis's back exactly the way `window.scrollTo` would. The page
 * would land on the right section and then be dragged back to wherever Lenis
 * still believed it was on the next wheel tick. Every same-document fragment
 * link is therefore taken here and handed to `lenis.scrollTo`, with the header
 * height subtracted so a heading does not open underneath it - see
 * `opensWithHero` for the one kind of target that is scrolled flush instead.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Null whenever Lenis is not driving - before mount, and for the whole
  // session under reduced motion.
  const lenisRef = useRef<Lenis | null>(null);

  const scrollToHash = useCallback(
    (hash: string, options?: { immediate?: boolean }) => {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      if (!id) return false;

      const target = document.getElementById(id);
      if (!target) return false;

      /*
       * A chapter that opens on a hero is scrolled flush; everything else
       * clears the bar.
       *
       * The offset exists so a heading does not land underneath the floating
       * header. A full-bleed hero is the one thing that *wants* to be
       * underneath it - it is a screen of dark photography and the bar is drawn
       * to float over exactly that. Offsetting it left the hero starting a
       * header's height down the screen, which had two costs. It looked wrong:
       * a full-screen photograph with a sliver of the previous section still
       * showing above it. And it broke the header, which decides whether to
       * open out by watching the band between the top of the viewport and its
       * own underside - the hero landed a pixel or two below that band, so the
       * bar stayed a compact pill over a screen filled with photography, and
       * which side of the boundary it fell on varied with rounding. That is the
       * "sometimes" in the bug: the same click behaved differently at different
       * widths.
       */
      const offset = opensWithHero(target) ? 0 : -headerOffset();
      const lenis = lenisRef.current;

      if (lenis) {
        /*
         * Re-measure before aiming, and this is not defensive - it is the
         * whole reason cross-page anchors were broken.
         *
         * Lenis caches the document's scroll limit and only recomputes it on
         * its own resize observation. Arriving here from an archive page means
         * coming from a ~3,400px document to a ~65,000px one in a client-side
         * navigation, and Lenis is still holding the old limit at the moment
         * this runs. `scrollTo` clamps to that limit, so a request for y=44,549
         * silently became y≈2,379 - the old page's maximum scroll - and the
         * reader landed inside the cinematic hero wondering why the anchor had
         * been ignored. Nothing errored; the number was simply cut down.
         *
         * `resize()` is cheap and idempotent, and it is the one call that makes
         * the target reachable.
         */
        lenis.resize();
        lenis.scrollTo(target, { offset, immediate: options?.immediate });
        return true;
      }

      // No Lenis means reduced motion, so an instant jump is the correct
      // behaviour rather than a fallback.
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY + offset,
        behavior: "auto",
      });

      return true;
    },
    [],
  );

  /*
   * Arriving on a route.
   *
   * With a fragment - from an archive page, from a bookmark, from a redirected
   * old path like `/about` - the page has to open at that section rather than
   * at the top.
   *
   * The hard part is not finding the target, it is that **the target moves
   * after it is found**. This document is ~65,000px tall and almost all of it
   * is above the fold: the cinematic hero alone reserves eight viewports, and
   * every chapter opens on a full-bleed hero whose images settle over the first
   * second. The previous version scrolled on the first frame the element
   * existed and stopped there, which meant a click on "Back to Gallery" landed
   * at y≈2,400 while `#gallery` was still 42,000px further down - measurably,
   * not theoretically. It looked like the anchor was being ignored; it was
   * being honoured against a page that had not finished growing.
   *
   * So this does not aim once. It re-aims every frame the target's *absolute*
   * offset changes, and stops only once that offset has held still for a few
   * consecutive frames - the layout having settled, rather than a timer having
   * expired. Absolute offset (`rect.top + scrollY`) is the right thing to watch
   * because scrolling changes `rect.top` but not the sum, so the loop measures
   * the page moving rather than its own effect on it.
   *
   * It also yields immediately to the reader. If a wheel, a touch or an arrow
   * key arrives mid-settle, the person has decided where they want to be and
   * this stops competing with them.
   */
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      lenisRef.current?.scrollTo(0, { immediate: true });
      return;
    }

    /** Frames the target must hold still before the layout counts as settled. */
    const SETTLED_FRAMES = 8;
    /** Ceiling on the whole exercise, in frames - roughly four seconds. */
    const MAX_FRAMES = 240;

    const id = decodeURIComponent(hash.replace(/^#/, ""));

    let frame = 0;
    let frames = 0;
    let stable = 0;
    let lastTop: number | null = null;
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };

    const settle = () => {
      if (cancelled) return;

      const target = document.getElementById(id);

      if (target) {
        const top = Math.round(
          target.getBoundingClientRect().top + window.scrollY,
        );

        if (lastTop === null || Math.abs(top - lastTop) > 1) {
          lastTop = top;
          stable = 0;
          scrollToHash(hash, { immediate: true });
        } else if (++stable >= SETTLED_FRAMES) {
          return;
        }
      }

      if (++frames > MAX_FRAMES) return;
      frame = requestAnimationFrame(settle);
    };

    settle();

    // Any deliberate scroll input ends the settle - the reader wins.
    const opts = { passive: true } as const;
    window.addEventListener("wheel", stop, opts);
    window.addEventListener("touchstart", stop, opts);
    window.addEventListener("keydown", stop, opts);

    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [pathname, scrollToHash]);

  /*
   * Same-document fragment links, taken before the router sees them.
   *
   * Capture phase and `preventDefault`: Next's `Link` bails out of its own
   * handler when the event is already defaulted, so one listener covers the
   * menu, the footer, the cards' "view all" links and any bare anchor alike -
   * none of them needs to know Lenis exists.
   *
   * The address bar is updated with `pushState` rather than by letting the
   * browser navigate, so Back returns to the previous section and the URL is
   * still something a reader can copy.
   */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!url.hash) return;

      // A fragment on *another* page is a real navigation; the effect above
      // catches it on arrival instead.
      if (url.pathname !== window.location.pathname) return;
      if (url.search !== window.location.search) return;

      if (!scrollToHash(url.hash)) return;

      event.preventDefault();

      if (url.hash !== window.location.hash) {
        window.history.pushState(null, "", url.hash);
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [scrollToHash]);

  /* Back and forward between sections, which move the fragment without a
     click and so never reach the handler above. */
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash) scrollToHash(window.location.hash);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [scrollToHash]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;


    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native scrolling on touch; emulated momentum feels wrong on mobile.
      syncTouch: false,
    });

    lenisRef.current = lenis;

    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToTop = useCallback(() => {
    const lenis = lenisRef.current;

    if (lenis) {
      lenis.scrollTo(0);
      return;
    }

    // No Lenis means the reader asked for reduced motion, so an instant jump
    // is the correct behaviour rather than a fallback.
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const value = useMemo<LenisContextValue>(
    () => ({ scrollToTop, scrollToHash }),
    [scrollToTop, scrollToHash],
  );

  return (
    <LenisContext.Provider value={value}>{children}</LenisContext.Provider>
  );
}

export function useLenis(): LenisContextValue {
  const context = useContext(LenisContext);

  if (!context) {
    throw new Error("useLenis must be used within a LenisProvider");
  }

  return context;
}
