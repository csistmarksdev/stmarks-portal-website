/**
 * iOS / iPadOS Safari 26 and later - the "Liquid Glass" Safari.
 *
 * That Safari floats its status bar and tab bar over the page and draws the
 * page behind them, unless a `position: fixed` or `position: sticky` element
 * spans the screen at that edge. Then it gives up and fills the bar with that
 * element's background colour, or with the page background when that
 * element is transparent. The home hero was built on exactly such an element,
 * a full-screen sticky stage, so the photograph stopped at the bars and the
 * bars went flat.
 *
 * Marking the root lets the stylesheet pin the hero a different way on that
 * browser only (see `[data-ios-glass]` in `globals.css`): with a scroll-driven
 * animation instead of `sticky`, so Safari sees ordinary content at both edges
 * and draws the photograph behind its bars.
 *
 * Checked before the first paint (it is part of the root layout's bootstrap
 * script), so the hero is never laid out the other way first. Chrome, Firefox
 * and Edge on iOS (CriOS / FxiOS / EdgiOS) draw their own toolbars and are left
 * alone, as is any Safari without scroll-driven animations, which keeps
 * `sticky`.
 */
export const IOS_GLASS_BOOTSTRAP = `(function(){try{var u=navigator.userAgent,v=/Version\\/(\\d+)/.exec(u),ios=/iP(hone|ad|od)/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1);if(ios&&v&&+v[1]>=26&&!/CriOS|FxiOS|EdgiOS/.test(u)&&window.CSS&&CSS.supports("animation-timeline: scroll()"))document.documentElement.setAttribute("data-ios-glass","")}catch(e){}})()`;
