"use client";

import type { LocalizedText } from "@portal/shared";
import {
  AlertTriangleIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { htmlToMarkup, markupToHtml, stripMarkers } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Paragraphs ⇄ plain text                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The API stores a post body as `LocalizedText[]` — one entry per paragraph,
 * carrying both languages. That is the right shape to *serve* but a miserable
 * shape to *write* into: it forces a separate box per paragraph.
 *
 * So the editor works in continuous prose, with a blank line between
 * paragraphs, and converts at the boundary. Emphasis rides along as markers
 * (`**bold**`) inside each paragraph — see `lib/rich-text`. Nothing about the
 * stored shape changes.
 */

export function paragraphsToText(body: LocalizedText[] | undefined, locale: "en" | "ta"): string {
  return (body ?? []).map((paragraph) => paragraph[locale] ?? "").join("\n\n");
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Zips the two languages back into the stored shape. Where one language has
 * fewer paragraphs the missing entries become empty strings rather than being
 * dropped, so paragraph *n* always refers to the same passage in both — the
 * Website renders them by index.
 */
export function textToParagraphs(englishText: string, tamilText: string): LocalizedText[] {
  const english = splitParagraphs(englishText);
  const tamil = splitParagraphs(tamilText);
  const length = Math.max(english.length, tamil.length);

  return Array.from({ length }, (_, index) => ({
    en: english[index] ?? "",
    ta: tamil[index] ?? "",
  }));
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                      */
/* -------------------------------------------------------------------------- */

function stats(text: string) {
  // Counted on the prose, not the markers, so emphasis never inflates a count.
  const words = stripMarkers(text).split(/\s+/).filter(Boolean).length;
  return {
    words,
    paragraphs: splitParagraphs(text).length,
    // Matches the server's estimate so the CMS and the site agree.
    minutes: Math.max(1, Math.round(words / 200)),
  };
}

/* -------------------------------------------------------------------------- */
/* Editor pane                                                                */
/* -------------------------------------------------------------------------- */

const MARKS = [
  { command: "bold", Icon: BoldIcon, name: "Bold", key: "B" },
  { command: "italic", Icon: ItalicIcon, name: "Italic", key: "I" },
  { command: "underline", Icon: UnderlineIcon, name: "Underline", key: "U" },
] as const;

type MarkCommand = (typeof MARKS)[number]["command"];

function Pane({
  label,
  hint,
  value,
  onChange,
  placeholder,
  tamil = false,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  tamil?: boolean;
}) {
  const { words, paragraphs, minutes } = stats(value);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<MarkCommand, boolean>>({
    bold: false,
    italic: false,
    underline: false,
  });

  /*
   * The editor is deliberately uncontrolled: its content is written once, on
   * mount, and never again. Re-assigning `innerHTML` on each keystroke — which
   * is what a controlled contenteditable amounts to — destroys and rebuilds
   * the nodes the caret lives in, so the cursor jumps to the end on every
   * character. The parent remounts this pane (via `key`) when a different post
   * is loaded, which is the only time the content should be replaced.
   */
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = markupToHtml(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncMarks = () => {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const apply = (command: MarkCommand) => {
    ref.current?.focus();
    /*
     * `execCommand` is deprecated but universally implemented, and it is the
     * only built-in that applies a mark across a selection while keeping the
     * selection intact. The alternative is a full editor framework or hand-
     * rolled Range surgery, neither of which this screen justifies.
     */
    document.execCommand(command);
    if (ref.current) onChange(htmlToMarkup(ref.current));
    syncMarks();
  };

  const isEmpty = words === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="label text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {MARKS.map(({ command, Icon, name, key }) => (
              <button
                key={command}
                type="button"
                // Keeps the selection alive: focus must not leave the editor.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => apply(command)}
                title={`${name} (Ctrl+${key})`}
                aria-label={name}
                aria-pressed={active[command]}
                className={cn(
                  "grid size-7 place-items-center rounded-lg transition-colors",
                  active[command]
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-hover-tint hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
          <span className="numeric text-[11px] text-muted-foreground">
            {isEmpty ? hint : `${paragraphs} ¶ · ${words} words · ~${minutes} min`}
          </span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {isEmpty && (
          <p
            aria-hidden
            className="pointer-events-none absolute inset-0 whitespace-pre-line p-5 text-[15px] leading-[1.85] text-muted-foreground/70"
          >
            {placeholder}
          </p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          spellCheck
          onInput={() => {
            if (ref.current) onChange(htmlToMarkup(ref.current));
          }}
          onKeyUp={syncMarks}
          onMouseUp={syncMarks}
          onFocus={syncMarks}
          onKeyDown={(event) => {
            if (!event.ctrlKey && !event.metaKey) return;
            const mark = MARKS.find(
              (candidate) => candidate.key.toLowerCase() === event.key.toLowerCase(),
            );
            if (!mark) return;
            // Ctrl+U opens "view source" in some browsers; claim it first.
            event.preventDefault();
            apply(mark.command);
          }}
          onPaste={(event) => {
            /*
             * Paste as plain text. Copying from Word or a web page otherwise
             * drops spans, colours and font stacks into the document, none of
             * which survive serialisation but all of which confuse the editor.
             */
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
            if (ref.current) onChange(htmlToMarkup(ref.current));
          }}
          className={cn(
            // A manuscript, not a form field: generous leading and a
            // comfortable measure. `[&_p]` spaces the paragraphs the browser
            // creates as the writer presses Enter.
            //
            // `scroll-mb-*` keeps the caret clear of the fixed action bar: when
            // the browser scrolls the cursor into view it honours the element's
            // scroll margin, so the line being typed never ends up underneath.
            "min-h-[55vh] flex-1 scroll-mb-32 rounded-2xl border border-input bg-card p-5 text-[15px] leading-[1.85] shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring [&_p:not(:last-child)]:mb-4",
            tamil ? "font-sans" : "font-[family-name:var(--font-display)]",
          )}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bilingual editor                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Side-by-side bilingual writing surface.
 *
 * Both languages stay visible on a wide screen so a translator can work
 * passage by passage; on a phone the panes become tabs, since two 40-character
 * columns are unusable there.
 */
export function BilingualEditor({
  englishText,
  tamilText,
  onEnglishChange,
  onTamilChange,
  hydrationKey,
}: {
  englishText: string;
  tamilText: string;
  onEnglishChange: (next: string) => void;
  onTamilChange: (next: string) => void;
  /** Changes when a different post is loaded, remounting the panes. */
  hydrationKey: string;
}) {
  const [mobilePane, setMobilePane] = useState<"en" | "ta">("en");

  const englishParagraphs = splitParagraphs(englishText).length;
  const tamilParagraphs = splitParagraphs(tamilText).length;
  const mismatched =
    englishParagraphs > 0 && tamilParagraphs > 0 && englishParagraphs !== tamilParagraphs;

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Write as you normally would — press Enter for a new paragraph. Select
        text and use the <strong>B</strong> / <em>I</em> /{" "}
        <u className="underline underline-offset-2">U</u> buttons, or Ctrl+B,
        Ctrl+I and Ctrl+U.
      </p>

      {/* Phone: one pane at a time. */}
      <div className="flex gap-1 rounded-full bg-muted p-1 lg:hidden">
        {(
          [
            ["en", "English"],
            ["ta", "தமிழ் Tamil"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMobilePane(value)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              mobilePane === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/*
        The panes grow with the article and the page scrolls, rather than the
        editor being locked to the viewport with its own inner scrollbar. A
        fixed-height box is fine for a paragraph and miserable for an essay:
        you write into a shrinking slot, and the caret keeps disappearing
        behind the action bar. Grid rows stretch, so the two languages stay the
        same height however unevenly they are translated.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(mobilePane === "en" ? "flex" : "hidden", "lg:flex")}>
          <Pane
            key={`en-${hydrationKey}`}
            label="English"
            hint="Nothing written yet"
            value={englishText}
            onChange={onEnglishChange}
            placeholder={"Write the post here.\n\nPress Enter to start a new paragraph."}
          />
        </div>
        <div className={cn(mobilePane === "ta" ? "flex" : "hidden", "lg:flex")}>
          <Pane
            key={`ta-${hydrationKey}`}
            label="தமிழ் — Tamil"
            hint="இன்னும் எழுதப்படவில்லை"
            value={tamilText}
            onChange={onTamilChange}
            placeholder={"இங்கே தமிழில் எழுதுங்கள்.\n\nபுதிய பத்திக்கு Enter அழுத்தவும்."}
            tamil
          />
        </div>
      </div>

      {mismatched && (
        <p className="flex items-start gap-2 rounded-2xl bg-accent-fg/10 px-4 py-3 text-[13px] text-accent-fg">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            English has {englishParagraphs} paragraph
            {englishParagraphs === 1 ? "" : "s"} and Tamil has {tamilParagraphs}.
            The website pairs them in order, so a reader in one language will
            hit a blank passage. Match the counts before publishing.
          </span>
        </p>
      )}
    </div>
  );
}
