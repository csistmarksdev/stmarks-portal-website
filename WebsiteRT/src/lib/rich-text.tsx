import type { ReactNode } from "react";

/**
 * Inline formatting for body copy.
 *
 * The API stores paragraphs as plain strings (`LocalizedText[]`), and that
 * contract is fixed - so emphasis travels as markers inside the string rather
 * than as HTML or a rich-text document:
 *
 *     **bold**      __underline__      *italic*
 *
 * Text with no markers renders exactly as it did before, so every existing
 * paragraph is unaffected.
 *
 * The markup is parsed into React elements rather than injected as HTML.
 * Editors are trusted, but body copy still arrives over the network, and
 * `dangerouslySetInnerHTML` would turn a compromised CMS account into script
 * execution on every reader's browser. There is no such risk here.
 *
 * The Portal has a copy of this syntax in `src/lib/rich-text.tsx` for its
 * editor preview. The two must agree - change both together.
 */

interface Rule {
  /** Captures the marked run; group 1 is the content inside the markers. */
  pattern: RegExp;
  wrap: (children: ReactNode, key: string) => ReactNode;
}

/*
 * Order matters: `**` is tried before `*` so that a bold run is not mistaken
 * for an italic one opening on its first asterisk.
 *
 * The `(?!\*)` on the closing marker is what makes nesting work. Bold text
 * ending in an italic run reaches us as `**a *b***`; without the lookahead the
 * lazy match stops at the first `**` of that `***` and the emphasis comes out
 * mangled. Refusing a close that is followed by another marker character
 * pushes it to the real boundary.
 */
const RULES: Rule[] = [
  {
    pattern: /\*\*([\s\S]+?)\*\*(?!\*)/,
    wrap: (children, key) => <strong key={key}>{children}</strong>,
  },
  {
    pattern: /__([\s\S]+?)__(?!_)/,
    wrap: (children, key) => (
      <u key={key} className="underline underline-offset-2">
        {children}
      </u>
    ),
  },
  {
    pattern: /\*([\s\S]+?)\*/,
    wrap: (children, key) => <em key={key}>{children}</em>,
  },
];

function parse(text: string, nextKey: () => string): ReactNode[] {
  let earliest: { rule: Rule; match: RegExpExecArray } | null = null;

  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (!match) continue;
    // Strictly earlier wins, so a tie leaves the higher-priority rule in place.
    if (!earliest || match.index < earliest.match.index) {
      earliest = { rule, match };
    }
  }

  if (!earliest) return text ? [text] : [];

  const { rule, match } = earliest;
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);

  return [
    ...parse(before, nextKey),
    rule.wrap(parse(match[1], nextKey), nextKey()),
    ...parse(after, nextKey),
  ];
}

/** Renders a paragraph's inline formatting. Plain text passes straight through. */
export function renderInline(text: string): ReactNode {
  let counter = 0;
  const nextKey = () => `m${counter++}`;
  const nodes = parse(text, nextKey);
  return nodes.length === 1 ? nodes[0] : nodes;
}

/** Strips markers - for previews, meta descriptions and other plain-text uses. */
export function stripMarkers(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*(?!\*)/g, "$1")
    .replace(/__([\s\S]+?)__(?!_)/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1");
}
