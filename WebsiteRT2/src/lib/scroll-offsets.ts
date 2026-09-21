/**
 * The scroll range of a block that is taller than the screen.
 *
 * ## Why this exists rather than the string form
 *
 * `[0, 1]` and `["start start", "end end"]` describe exactly the same range -
 * framer resolves a bare number `x` to the pair `[x, x]`, so `0` *is*
 * "start start" and `1` *is* "end end". They are not interchangeable, and the
 * difference is a crash.
 *
 * Framer matches the string form against a table of presets and, on a match,
 * hands the animation to a native `ViewTimeline` with a named range. The
 * preset `[[0, 0], [1, 1]]` is mapped to `contain` - the stretch of scroll over
 * which the subject is *entirely inside* the scrollport.
 *
 * Every pinned stage on this site is a block of `100svh + 160svh`. It is never
 * entirely inside anything. `contain` is therefore an empty range on these
 * elements, the browser computes keyframe offsets that run backwards, and
 * `Element.animate` throws:
 *
 *     TypeError: Failed to execute 'animate' on 'Element':
 *     Offsets must be monotonically non-decreasing.
 *
 * That throw happens during the hook, so it is not a console warning - it takes
 * the route down to `error.tsx` and the reader gets the error page instead of
 * the chapter.
 *
 * The numeric form matches no preset, so framer falls back to measuring the
 * scroll in JavaScript, which is what it did before it learned about view
 * timelines and is correct for a subject of any height.
 *
 * ## Why a function
 *
 * A fresh array per call. A shared module-scope array would be handed to every
 * `useScroll` on the page at once, and nothing in framer's contract promises it
 * will not normalise that array in place.
 *
 * @see https://drafts.csswg.org/scroll-animations-1/#view-timelines-ranges
 */
export function pinnedRange(): [number, number] {
  return [0, 1];
}

/**
 * The approach: the top of a block travelling from the bottom of the viewport
 * to the top of it.
 *
 * Safe as strings - `[[0, 1], [0, 0]]` matches none of framer's presets, so it
 * is measured in JavaScript whatever the height of the subject. Written here
 * beside `pinnedRange` all the same, so the two halves of every pinned stage's
 * scroll are one thing to read and one place to change.
 *
 * It exists because `pinnedRange` is exactly zero for the whole screen-height a
 * section spends climbing into view: gate a stage's contents on the pin and the
 * reader gets a screen of empty ground before anything appears.
 */
export function approachRange(): ["start end", "start start"] {
  return ["start end", "start start"];
}
