import type { CSSProperties } from "react";

/**
 * A line of text broken into individually animatable letters.
 *
 * Used by the home hero, where the splash hands over to the page: each letter
 * rises into place a beat after the one before it. The animation itself lives
 * in the hand-over section of `globals.css` - this component's whole job is to
 * produce the elements it can address, and to do so without damaging the text.
 *
 * Three things make that harder than wrapping every character in a span.
 *
 * **Tamil.** This site is published in Tamil as well as English, and Tamil is a
 * complex script: `தூ` is two code points, a consonant and a vowel sign, that
 * render as one indivisible letter. `Array.from` or a spread would split it
 * into `த` and `ூ`, and the page would show a broken cluster with a stray mark
 * floating beside it. `Intl.Segmenter` at grapheme granularity is what gets
 * this right, and it is the reason this is not a one-line `text.split("")`.
 *
 * **Wrapping.** Letters are `inline-block` so they can be transformed at all -
 * a transform does nothing to a non-replaced inline box - and a run of
 * inline-blocks will break mid-word at the end of a line. So letters are
 * grouped into words, and the word is what wraps.
 *
 * **Reading.** Fifty spans of one letter each are not text to a screen reader,
 * and in a heading that matters. The split copy is hidden from the
 * accessibility tree entirely and the real sentence is carried alongside it, so
 * what is announced is the line, once, as written.
 */

/** Milliseconds between one letter starting and the next. */
export const LETTER_STEP_MS = 18;

/**
 * Splits into grapheme clusters - what a reader would call a letter - rather
 * than code points.
 *
 * `Intl.Segmenter` is in every current browser and in Node, so the fallback is
 * for very old engines only. It splits by code point, which is wrong for Tamil
 * and right for Latin; a degraded animation in a browser that old is a better
 * outcome than no text at all.
 */
function toLetters(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });

    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }

  return Array.from(text);
}

interface Word {
  letters: string[];
  /** The animation index of this word's first letter, counting from zero. */
  offset: number;
}

/**
 * Numbers every letter in the line, continuing across words.
 *
 * A plain function rather than a counter incremented inside the JSX: React's
 * compiler is right to object to a variable being reassigned from inside
 * something it may re-run, and the arithmetic is clearer collected in one place
 * anyway.
 */
function layout(words: string[]): Word[] {
  const laid: Word[] = [];
  let cursor = 0;

  for (const word of words) {
    const letters = toLetters(word);
    laid.push({ letters, offset: cursor });
    // The space that follows the word takes an index too, so the pause between
    // two words is the same length as the pause between two letters.
    cursor += letters.length + 1;
  }

  return laid;
}

export interface SplitTextProps {
  /** The line to break up. */
  children: string;
  className?: string;
}

export function SplitText({ children, className }: SplitTextProps) {
  /*
   * Split on the space rather than on a general whitespace class: a line of
   * hero copy has single spaces in it, and anything else in there - a
   * non-breaking space between a number and a unit, say - is deliberate and
   * belongs inside its word.
   */
  const words = layout(children.split(" "));

  return (
    <>
      {/*
        The line as written, for anyone not looking at it. Everything below is
        `aria-hidden`, so this is the only copy in the accessibility tree.
      */}
      <span className="sr-only">{children}</span>

      <span aria-hidden className={className}>
        {words.map((word, wordIndex) => (
          <span key={`${wordIndex}-${word.offset}`} className="split-word">
            {word.letters.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="split-letter"
                style={{ "--split-i": word.offset + index } as CSSProperties}
              >
                {letter}
              </span>
            ))}

            {/*
              The space that followed this word, kept inside it rather than
              between the word elements. A space *between* two inline-block
              boxes is collapsible whitespace a formatter is free to reflow
              away; this one is part of the box and survives.
            */}
            {wordIndex < words.length - 1 ? (
              <span className="split-space"> </span>
            ) : null}
          </span>
        ))}
      </span>
    </>
  );
}
