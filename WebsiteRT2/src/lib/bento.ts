/**
 * The repeating shape of the mosaic: how many columns each tile takes, cycled.
 *
 * `2, 1, 1, 2` over three columns is the smallest pattern that gives a bento
 * its character without any tile ever being orphaned. Each row is a wide tile
 * beside a narrow one, and the pair swaps sides on the next row, so the eye is
 * pulled left and right down the grid instead of straight down three even
 * columns - and every row still adds to exactly three.
 */
const PATTERN = [2, 1, 1, 2];

/**
 * Column spans for a bento grid of `count` tiles, guaranteed to leave no holes.
 *
 * Two rules do the guaranteeing, and both matter because the fellowships come
 * from the Portal - the church can add or retire one at any time, and a layout
 * that only tiles at seven is a layout that breaks the day it becomes eight.
 *
 * **A tile never overflows its row.** Where the pattern asks for more columns
 * than are left, it takes what is left instead. So a wide tile landing in a
 * one-column gap simply becomes a narrow one rather than wrapping and leaving
 * the gap behind it empty.
 *
 * **The last tile fills its row.** An odd count would otherwise end on a short
 * row with a hole beside it - which is exactly what the plain three-column grid
 * did, and what made seven fellowships read as six and a leftover. Stretched,
 * the last one closes the mosaic instead.
 */
export function bentoSpans(count: number, columns = 3): number[] {
  if (count <= 0 || columns < 1) return [];

  const spans: number[] = [];
  let cursor = 0;

  for (let index = 0; index < count; index += 1) {
    const wanted = Math.min(PATTERN[index % PATTERN.length], columns);
    const span = Math.min(wanted, columns - cursor);

    spans.push(span);
    cursor = (cursor + span) % columns;
  }

  if (cursor !== 0) spans[spans.length - 1] += columns - cursor;

  return spans;
}
