"use client";

import { useEffect, type RefObject } from "react";

import { useHeroScroll } from "@/providers/hero-scroll-provider";

/**
 * Tells the header that this element is one of the things that can sit
 * underneath it.
 *
 * The header has two states - transparent and full width over dark full-bleed
 * media, a compact glass pill over page content - and until recently it only
 * knew about the first hero on the page. That was right when there was one hero
 * per route. On the single page there are nine, so the bar took its glass
 * surface once the cinematic sequence had played out and kept it for the rest
 * of the document, sitting as an opaque pill over eight full-screen
 * photographs it was designed to float above.
 *
 * Not only heroes. The eight cinematic stages - the constellations, the doors,
 * the nave, the flame and the rest - register through here too: a pinned,
 * full-bleed dark screen is the same thing to the bar whether what fills it is
 * a photograph or a drawing, and a glass pill over one of them is just as much
 * the only opaque object in the frame.
 *
 * Registration only. The measuring is done once, for every registered frame at
 * the same moment, in `HeroScrollProvider` - see the note there for why one
 * shared pass beats an observer per hero, and why that difference is felt on a
 * phone rather than on a desktop.
 */
export function useHeroUnderHeader(ref: RefObject<HTMLElement | null>): void {
  const { registerHeroFrame } = useHeroScroll();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    return registerHeroFrame(node);
  }, [ref, registerHeroFrame]);
}
