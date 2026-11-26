/**
 * Two-letter monogram for a person without a portrait.
 *
 * F-086: honorifics are stripped in both languages before the letters are
 * taken. The Tamil names carry அருள்திரு / திரு. / திருமதி / பணி. in front, so
 * stripping only "Rev." / "Mr." gave most laypeople the same meaningless
 * monogram (திரு → த). Letters are whole graphemes, so a Tamil initial keeps
 * its vowel sign (வி, not வ).
 */
const HONORIFIC =
  /^(?:the\s+)?(?:rt\.?\s*rev\.?|rev\.?|mrs\.?|mr\.?|ms\.?|miss|dr\.?|prof\.?|பேரருள்திரு\.?|அருள்திரு\.?|திருமதி\.?|திரு\.?|செல்வி\.?|பணி\.?|ரெவ்\.?|முனைவர்\.?|டாக்டர்\.?)(?=\s|$)\s*/iu;

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function firstGrapheme(word: string): string {
  if (!segmenter) return word[0] ?? "";
  for (const { segment } of segmenter.segment(word)) return segment;
  return "";
}

export function initials(name: string): string {
  let rest = name.trim();
  // Titles can stack ("Rev. Dr. …", "அருள்திரு. முனைவர் …").
  for (let i = 0; i < 4 && HONORIFIC.test(rest); i++) rest = rest.replace(HONORIFIC, "");

  return rest
    .split(/\s+/)
    .map((part) => part.replace(/[.,]/g, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map(firstGrapheme)
    .join("")
    .toUpperCase();
}
