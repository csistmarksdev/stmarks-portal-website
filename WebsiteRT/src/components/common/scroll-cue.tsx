import { cn } from "@/lib/utils";

export interface ScrollCueProps {
  className?: string;
}

/**
 * The cue at the foot of a hero: a hairline with a light travelling down it.
 *
 * Wordless, and deliberately. The label it used to carry ("Scroll to explore")
 * was doing nothing the motion does not already say - a light moving downward
 * at the bottom edge of a full-height hero reads as "there is more below" in
 * any language, which also spares this the awkwardness of setting a second
 * piece of UI copy in two scripts over a photograph.
 *
 * The hairline is the site's own idiom rather than a stock mouse glyph: the
 * same rule that pulses in `loading.tsx`, sweeps under the splash's crest and
 * rules the illuminated dividers. Here it runs vertically, which is the whole
 * of the message.
 *
 * Wholly decorative, so `aria-hidden`. This is an affordance about where the
 * viewport is, and a reader moving through the document by headings and
 * landmarks does not need to be told to scroll - the old label announced
 * itself to exactly the audience it was useless to.
 *
 * Shared by the cinematic home stage and every inner-page hero so the gesture
 * reads the same everywhere. The home stage fades it out against hero scroll
 * progress; everywhere else it simply sits.
 */
export function ScrollCue({ className }: ScrollCueProps) {
  return (
    <div aria-hidden className={cn("flex justify-center", className)}>
      <span className="scroll-cue">
        <span className="scroll-cue-beam" />
      </span>
    </div>
  );
}
