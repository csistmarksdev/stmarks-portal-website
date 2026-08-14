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
 *
 * The `width`/`height` are load-bearing, not decoration. Without them the SVG
 * has no intrinsic size, so as a `background-image` it stretches to the whole
 * background area and `feTurbulence` is generated across every pixel of the
 * section — on a tall page that is millions of pixels of four-octave noise,
 * rastered tile-by-tile as the section scrolls in, which is felt as a stall
 * exactly when the block enters view. Given a size it is generated once at
 * 180x180 and repeated, which is what `stitchTiles='stitch'` was always for:
 * the noise is periodic, so the tiling is seamless. One user unit stays one
 * pixel either way, so the grain is the same grain — only far cheaper.
 */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
