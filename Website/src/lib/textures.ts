/**
 * Shared surface textures, as inline SVG data URIs.
 *
 * Kept here rather than in each component so the same tooth reads across the
 * site — the dark verse section, the pastor's message, and the faint tooth now
 * carried on every light section all draw from one source.
 */

/**
 * Fine fractal-noise film grain. Painted at a low opacity it gives a flat fill
 * a printed-paper surface rather than the dead evenness of a CSS colour. Tune
 * the *visibility* at the call site with opacity + a blend mode (multiply over
 * parchment, overlay over ink) — the texture itself is full-strength here.
 */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
