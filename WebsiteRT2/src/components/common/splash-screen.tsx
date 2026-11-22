"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * A brief title card - the parish emblem on the season's ink - shown on the
 * home page only, at most once per browser session, and gone within
 * `VISIBLE_MS`. It never holds content back: nothing else on the page waits for
 * it, it sets no scroll lock, and it fetches one small logo.
 *
 * Rendered from the root layout on every route, so the component decides for
 * itself: off the home route (`/` and `/en`; next-intl's `usePathname` strips
 * the locale) it renders nothing at all - no markup, no script, no attribute.
 *
 * On the home route the server HTML carries the overlay plus a tiny inline
 * script that runs before the overlay is parsed. It hides the overlay (via
 * `html[data-splash-skip]`) when:
 *  - this session has already seen it (`sessionStorage`),
 *  - the device asks for reduced motion,
 *  - the reader chose Simple mode (`data-motion="off"`) or this is the reload
 *    that switching modes causes (`data-skip-splash`) - both are set earlier in
 *    the body by `MOTION_BOOTSTRAP`.
 * The same conditions are repeated in CSS where they can be, so the card is
 * also hidden if the script cannot run.
 *
 * The exit is pure CSS: a short hold, then a fade that ends with
 * `visibility: hidden` at `VISIBLE_MS`. That is also the whole no-JS story -
 * without JavaScript the card simply fades on the same schedule. The effect
 * below only unmounts it afterwards.
 */

/** Total time on screen, hold plus fade. */
const VISIBLE_MS = 600;
const FADE_MS = 220;

const SEEN_KEY = "home-splash-seen";
const SPLASH_ID = "home-splash";

/**
 * Set once the first instance has mounted on the client. A later mount - the
 * `[locale]` layout remounting on a language switch, say - is a client-side
 * navigation, never a hard load, so it must not show the card.
 */
let hasMounted = false;

const STYLE = `#${SPLASH_ID}{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:var(--splash-ink,#2e2027);animation:${SPLASH_ID}-out ${FADE_MS}ms ease-in ${VISIBLE_MS - FADE_MS}ms forwards}#${SPLASH_ID} img{width:6rem;height:6rem;object-fit:contain}html[data-splash-skip] #${SPLASH_ID},html[data-motion="off"] #${SPLASH_ID},html[data-skip-splash] #${SPLASH_ID}{display:none}@media (prefers-reduced-motion:reduce){#${SPLASH_ID}{display:none}}@keyframes ${SPLASH_ID}-out{to{opacity:0;visibility:hidden}}`;

const BOOTSTRAP = `(function(){var d=document.documentElement.dataset,k=${JSON.stringify(
  SEEN_KEY,
)},s=null;try{s=sessionStorage.getItem(k)}catch(e){}if(s||d.motion==="off"||"skipSplash" in d||matchMedia("(prefers-reduced-motion: reduce)").matches){d.splashSkip=""}else{try{sessionStorage.setItem(k,"1")}catch(e){}}})()`;

export interface SplashScreenProps {
  /**
   * Accepted for the layout's existing call and ignored: the card no longer
   * plays a montage, so it downloads none of these photographs.
   */
  reel?: string[];
}

export const SplashScreen: (props: SplashScreenProps) => ReactNode =
  function SplashScreen() {
    const pathname = usePathname();
    const [shown, setShown] = useState(() => !hasMounted && pathname === "/");
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      hasMounted = true;
      if (!shown) return;

      const root = document.documentElement;
      const card = cardRef.current;

      const done = () => setShown(false);

      // Skipped by the bootstrap or the CSS, or already faded before hydration.
      const over =
        !card ||
        "splashSkip" in root.dataset ||
        getComputedStyle(card).visibility === "hidden" ||
        getComputedStyle(card).display === "none";

      card?.addEventListener("animationend", done, { once: true });
      const timer = window.setTimeout(done, over ? 0 : VISIBLE_MS + 200);

      return () => {
        card?.removeEventListener("animationend", done);
        window.clearTimeout(timer);
        // Only once the card is unmounted: clearing it first would un-hide a
        // skipped card and start its animation from the beginning.
        if (!card?.isConnected) delete root.dataset.splashSkip;
      };
    }, [shown]);

    if (!shown) return null;

    return (
      <>
        {/*
          Raw markup, not `<script>`/`<style>` elements, for the reason given
          at the bootstrap in the root layout: the browser runs it before the
          card below is parsed, and React never creates a script element on
          the client.
        */}
        <div
          hidden
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `<style>${STYLE}</style><script>${BOOTSTRAP}</script>`,
          }}
        />
        <div id={SPLASH_ID} ref={cardRef} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- in the server HTML before hydration; no optimiser round-trip */}
          <img
            src="/brand/csi-emblem-192-v2.webp"
            alt=""
            width={192}
            height={192}
            decoding="async"
          />
        </div>
      </>
    );
  };
