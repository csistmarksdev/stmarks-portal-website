/**
 * Whether the site should move - one answer for every animation on it.
 *
 * Two things can ask for a still site. The reader's device can
 * (`prefers-reduced-motion`), and the reader can, from the site itself:
 * "Simple mode" is for a phone that finds the cinematic sections heavy, and it
 * turns the site into the same plain, still version the device setting gets -
 * one version to maintain, not two.
 *
 * The site switch is kept in `localStorage` and mirrored onto
 * `<html data-motion="off">` before the first paint (see
 * `MOTION_BOOTSTRAP`), which is what the stylesheet keys on; script asks
 * `isMotionReduced()`, which reads both.
 *
 * The stored value has three states:
 *
 *   "off"    the reader chose Simple mode
 *   "on"     the reader chose the animated site
 *   (none)   no choice yet - the device decides: a low-end phone opens in
 *            Simple mode, anything else animated (see `LOW_END_TEST`)
 *
 * "on" has to be stored rather than the key removed, or a reader on a low-end
 * phone who switched the animations back on would be put back into Simple mode
 * on the very next page.
 */

export const MOTION_STORAGE_KEY = "site-motion";

/**
 * A low-end phone, judged before the first paint, as a JavaScript expression.
 *
 * Simple mode becomes the default here because the cinematic sections - frame
 * sequences, smooth scrolling, pinned scenes - are what a budget Android on
 * prepaid data struggles with (F-033). Only a default: the reader's own choice
 * in the switch always wins.
 *
 * Touch devices only (`pointer: coarse`), and then any of:
 *
 * - **Data Saver / Lite mode** is on (`connection.saveData`): the reader has
 *   already told the browser to spend less.
 * - **A 2G connection** (`effectiveType` "slow-2g" or "2g"). 3G is left out on
 *   purpose: Chrome measures it from the connection of the moment, and busy
 *   Indian networks report it on good phones, which would flip the site between
 *   the two modes from one visit to the next.
 * - **Little memory**: `deviceMemory` of 2 GB or less, or 4 GB with four or
 *   fewer processor cores. Chrome reports memory as a rounded bucket (0.25 ...
 *   8), so these are the budget tiers.
 *
 * Safari and Firefox expose none of these signals, so an iPhone or a Firefox
 * reader always opens animated unless they choose otherwise.
 */
const LOW_END_TEST =
  '(function(){try{var n=navigator,c=n.connection||{},d=n.deviceMemory,k=n.hardwareConcurrency||8;if(!matchMedia("(pointer: coarse)").matches)return false;return c.saveData===true||/(^|-)2g$/.test(c.effectiveType||"")||(typeof d==="number"&&(d<=2||(d<=4&&k<=4)))}catch(e){return false}})()';

/**
 * Set for exactly one load: the reload `setSimpleMode` causes. The reader has
 * already seen the opening once this visit and only asked to change how the
 * site moves, so that reload goes straight to the page - in either direction.
 *
 * Its value is `<mode>|<message>`: the mode being switched to, which picks the
 * icon (the switch's own bolt or sparkle), and the "Switching to ..." message,
 * already in the reader's language, which the new page shows from its first paint (see
 * `MOTION_BOOTSTRAP` and `.motion-switching` in `globals.css`) until it is
 * ready - so the change reads as one continuous step rather than a page going
 * blank and coming back different.
 */
const SWITCH_KEY = "site-motion-switch";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Runs before the first paint, from the root layout, so nothing - not the
 * splash, not the first frame of the cinematic hero - is drawn in motion for a
 * reader who has turned it off. Wrapped in `try` because storage can throw
 * (private browsing on older Safari, blocked site data).
 */
export const MOTION_BOOTSTRAP = `try{var s=null;try{s=localStorage.getItem(${JSON.stringify(
  MOTION_STORAGE_KEY,
)})}catch(e){}if(s==="off"||(s!=="on"&&${LOW_END_TEST}))document.documentElement.dataset.motion="off"}catch(e){}try{var m=sessionStorage.getItem(${JSON.stringify(
  SWITCH_KEY,
)});if(m){sessionStorage.removeItem(${JSON.stringify(
  SWITCH_KEY,
)});var r=document.documentElement,i=m.indexOf("|");r.dataset.skipSplash="";r.dataset.switchingTo=m.slice(0,i);r.dataset.switching=m.slice(i+1)}}catch(e){}`;

/**
 * Whether this load should open without the splash: Simple mode, or the
 * reload that switching modes causes (see `SWITCH_KEY`).
 */
export function skipsSplash(): boolean {
  return (
    isSimpleMode() ||
    (typeof document !== "undefined" &&
      "skipSplash" in document.documentElement.dataset)
  );
}

/** True when the site switch is set to Simple mode. */
export function isSimpleMode(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.dataset.motion === "off"
  );
}

/** True when anything - the device or the site switch - asks for no motion. */
export function isMotionReduced(): boolean {
  if (typeof window === "undefined") return false;
  return isSimpleMode() || window.matchMedia(REDUCE_QUERY).matches;
}

/**
 * Turns Simple mode on or off, and reloads - showing `message` ("Switching to
 * Simple mode...") from the tap until the reloaded page is ready.
 *
 * A reload rather than a live switch, deliberately. The two versions of the
 * site are not the same height - the cinematic sections pin for many screens
 * of scroll, their still versions are a screen each - so switching live
 * strands the reader at a meaningless offset, while half the page's motion
 * (the smooth scroller, the frame sequences, the splash) is set up once per
 * load and would need tearing down by hand. A reload gets every part of the
 * site to the same answer at once, and it is a choice made rarely.
 */
export function setSimpleMode(on: boolean, message: string): void {
  try {
    // "on" is stored, not removed: with no choice stored, a low-end phone
    // would open in Simple mode again on the next page.
    localStorage.setItem(MOTION_STORAGE_KEY, on ? "off" : "on");
  } catch {
    // Storage blocked: the choice still applies to this page view.
  }

  // The message goes up now, over this page, and stays through the reload.
  const to = on ? "simple" : "animated";
  document.documentElement.dataset.switchingTo = to;
  document.documentElement.dataset.switching = message;

  // The reload opens straight onto the page, without the splash, still
  // showing the message until the new page is ready.
  try {
    sessionStorage.setItem(SWITCH_KEY, `${to}|${message}`);
  } catch {
    // Storage blocked: the splash plays once more, nothing worse.
  }

  window.location.reload();
}

/** For `useSyncExternalStore`: the device setting can change while open. */
export function subscribeMotion(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
