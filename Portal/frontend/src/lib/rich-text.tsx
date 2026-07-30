import type { ReactNode } from "react";

/**
 * Inline formatting for body copy — the Portal's half of the syntax.
 *
 * **This mirrors `Website/src/lib/rich-text.tsx` and must stay in step with
 * it.** The two projects have no shared package, so the syntax is duplicated
 * rather than imported; if one side gains a mark the other must too, or the
 * editor preview stops matching what readers see.
 *
 *     **bold**      __underline__      *italic*
 *
 * Emphasis lives inside the stored string because `body` is `LocalizedText[]`
 * — an array of plain strings — and that response format is fixed. Nothing
 * about the API changes to support formatting.
 */

export const BOLD = "**";
export const UNDERLINE = "__";
export const ITALIC = "*";

interface Rule {
  pattern: RegExp;
  wrap: (children: ReactNode, key: string) => ReactNode;
}

/*
 * `**` is tried before `*`, so bold is not read as an italic run.
 *
 * The `(?!\*)` on the closing marker is what makes nesting work. Bold text
 * ending in an italic run produces `**a *b***`; without the lookahead the lazy
 * match stops at the first `**` of that `***` and the emphasis comes out
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
    if (!earliest || match.index < earliest.match.index) {
      earliest = { rule, match };
    }
  }

  if (!earliest) return text ? [text] : [];

  const { rule, match } = earliest;
  return [
    ...parse(text.slice(0, match.index), nextKey),
    rule.wrap(parse(match[1], nextKey), nextKey()),
    ...parse(text.slice(match.index + match[0].length), nextKey),
  ];
}

/** Renders a paragraph's inline formatting, exactly as the Website will. */
export function renderInline(text: string): ReactNode {
  let counter = 0;
  const nextKey = () => `m${counter++}`;
  const nodes = parse(text, nextKey);
  return nodes.length === 1 ? nodes[0] : nodes;
}

/** Strips markers — for word counts and other plain-text uses. */
export function stripMarkers(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*(?!\*)/g, "$1")
    .replace(/__([\s\S]+?)__(?!_)/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1");
}

/* -------------------------------------------------------------------------- */
/* Marked text ⇄ editable HTML                                                */
/* -------------------------------------------------------------------------- */

/** Paragraphs are separated by a blank line in the stored string. */
const PARAGRAPH_BREAK = "\n\n";

/** contenteditable pads runs with these; ordinary spaces are stored instead. */
const NON_BREAKING_SPACE = / /g;

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

/**
 * Stored content is escaped before it becomes editor HTML. The markers are
 * ours, but the surrounding prose is arbitrary text from the database, and it
 * is about to be assigned to `innerHTML`.
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (character) => ESCAPES[character]);
}

function inlineToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([\s\S]+?)\*\*(?!\*)/g, "<strong>$1</strong>")
    .replace(/__([\s\S]+?)__(?!_)/g, "<u>$1</u>")
    .replace(/\*([\s\S]+?)\*/g, "<em>$1</em>");
}

/** Blank-line-separated marked text → the paragraphs the editor renders. */
export function markupToHtml(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // An empty editor still needs one block, or the caret has nowhere to land.
  if (paragraphs.length === 0) return "<p><br></p>";
  return paragraphs.map((paragraph) => `<p>${inlineToHtml(paragraph)}</p>`).join("");
}

const MARKER_FOR_TAG: Record<string, string> = {
  STRONG: BOLD,
  B: BOLD,
  EM: ITALIC,
  I: ITALIC,
  U: UNDERLINE,
  INS: UNDERLINE,
};

function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  if (element.tagName === "BR") return "\n";

  const inner = Array.from(element.childNodes).map(serializeInline).join("");
  const marker = MARKER_FOR_TAG[element.tagName];

  // Wrapping blank text in markers would leave a stray `****` behind.
  if (!marker || !inner.trim()) return inner;
  return `${marker}${inner}${marker}`;
}

/** The editor's DOM → blank-line-separated marked text, ready to store. */
export function htmlToMarkup(root: HTMLElement): string {
  const blocks: string[] = [];

  for (const child of Array.from(root.childNodes)) {
    const isBlock =
      child.nodeType === Node.ELEMENT_NODE &&
      ["P", "DIV"].includes((child as HTMLElement).tagName);

    if (isBlock) {
      blocks.push(serializeInline(child));
    } else {
      // Loose text or inline nodes at the top level belong to one paragraph.
      const text = serializeInline(child);
      if (blocks.length === 0) blocks.push(text);
      else blocks[blocks.length - 1] += text;
    }
  }

  return blocks
    .map((block) => block.replace(NON_BREAKING_SPACE, " ").trim())
    .filter(Boolean)
    .join(PARAGRAPH_BREAK);
}
