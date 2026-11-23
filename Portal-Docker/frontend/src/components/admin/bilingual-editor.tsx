"use client";

import type { LocalizedText } from "@portal/shared";
import {
  AlertTriangleIcon,
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  Redo2Icon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  canRedo,
  canUndo,
  getHistory,
  readSelection,
  record,
  redo,
  startHistory,
  undo,
  writeSelection,
  type History,
  type Snapshot,
} from "@/lib/editor-history";
import { useLanguageView, type LanguageView } from "@/lib/language-view";
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

/**
 * Block styles. Each stores as a paragraph prefixed `# ` / `## ` (see
 * `lib/rich-text`), so the website renders them as headings in the article.
 * Clicking the active one again turns the line back into a paragraph.
 */
const BLOCKS = [
  { tag: "h2", Icon: Heading1Icon, name: "Title", key: "1" },
  { tag: "h3", Icon: Heading2Icon, name: "Subtitle", key: "2" },
] as const;

type BlockTag = (typeof BLOCKS)[number]["tag"];

function Pane({
  label,
  hint,
  value,
  onChange,
  placeholder,
  historyKey,
  tamil = false,
}: {
  label: string;
  /** Identifies this post + language, so undo history outlives the pane. */
  historyKey: string;
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
  const [block, setBlock] = useState<BlockTag | "p">("p");
  const history = useRef<History | null>(null);
  /** Overrides the native inputType for edits we drive ourselves. */
  const pendingType = useRef<string | null>(null);
  // Bumped after each history change so the undo/redo buttons re-render.
  const [, setHistoryVersion] = useState(0);

  /*
   * The editor is deliberately uncontrolled: its content is written once, on
   * mount, and never again. Re-assigning `innerHTML` on each keystroke — which
   * is what a controlled contenteditable amounts to — destroys and rebuilds
   * the nodes the caret lives in, so the cursor jumps to the end on every
   * character. The parent remounts this pane (via `key`) when a different post
   * is loaded, which is the only time the content should be replaced.
   */
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = markupToHtml(value);

    /*
     * Coming back to the Write step remounts the pane. Its history is picked
     * up again only if it still describes this text — if the body changed
     * some other way meanwhile, an undo would resurrect stale content.
     */
    const existing = getHistory(historyKey);
    const top = existing?.states[existing.index];
    // Compared as stored text, since the browser's HTML for the same content
    // (`<b>` vs `<strong>`, stray `&nbsp;`) rarely matches ours byte for byte.
    // An empty body always starts fresh: every new post shares the "new" key.
    const probe = document.createElement("div");
    if (top) probe.innerHTML = top.html;
    if (existing && top && value.trim() && htmlToMarkup(probe) === value) {
      history.current = existing;
      root.innerHTML = top.html;
    } else {
      history.current = startHistory(historyKey, { html: root.innerHTML, start: 0, end: 0 });
    }
    setHistoryVersion((version) => version + 1);

    // Undo from the context menu or a phone's shake/gesture arrives as a
    // `beforeinput`; route it through our history too.
    const onBeforeInput = (event: InputEvent) => {
      if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
        event.preventDefault();
        step(event.inputType === "historyUndo" ? "undo" : "redo");
      }
    };
    root.addEventListener("beforeinput", onBeforeInput);
    return () => root.removeEventListener("beforeinput", onBeforeInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshot = (): Snapshot | null => {
    const root = ref.current;
    if (!root) return null;
    return { html: root.innerHTML, ...readSelection(root) };
  };

  /** Records the editor's state into the undo history and reports the text. */
  const commit = (inputType: string, data: string | null = null) => {
    const root = ref.current;
    const current = snapshot();
    if (!root || !current || !history.current) return;
    record(history.current, current, inputType, data);
    onChange(htmlToMarkup(root));
    setHistoryVersion((version) => version + 1);
  };

  const step = (direction: "undo" | "redo") => {
    const root = ref.current;
    if (!root || !history.current) return;
    const target = direction === "undo" ? undo(history.current) : redo(history.current);
    if (!target) return;
    root.innerHTML = target.html;
    root.focus();
    writeSelection(root, target.start, target.end);
    onChange(htmlToMarkup(root));
    setHistoryVersion((version) => version + 1);
    syncMarks();
  };

  /** Runs an `execCommand` as one distinct undo step. */
  const run = (inputType: string, command: string, argument?: string) => {
    pendingType.current = inputType;
    document.execCommand(command, false, argument);
    pendingType.current = null;
    // `execCommand` fires `input` itself, but not in every browser; committing
    // again is harmless, since an unchanged snapshot only refreshes the caret.
    commit(inputType);
  };

  const syncMarks = () => {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
    const current = document.queryCommandValue("formatBlock").toLowerCase();
    setBlock(current === "h2" || current === "h3" ? current : "p");
    // Keep the caret in the top step current, so an undo lands where the
    // writer actually was rather than where they last typed.
    const now = snapshot();
    const top = history.current?.states[history.current.index];
    if (now && top && top.html === now.html) {
      history.current!.states[history.current!.index] = now;
    }
  };

  const apply = (command: MarkCommand) => {
    ref.current?.focus();
    /*
     * `execCommand` is deprecated but universally implemented, and it is the
     * only built-in that applies a mark across a selection while keeping the
     * selection intact. The alternative is a full editor framework or hand-
     * rolled Range surgery, neither of which this screen justifies.
     */
    run(`format-${command}`, command);
    syncMarks();
  };

  const applyBlock = (tag: BlockTag) => {
    ref.current?.focus();
    const current = document.queryCommandValue("formatBlock").toLowerCase();
    // Angle brackets are the form every browser accepts for `formatBlock`.
    run("format-block", "formatBlock", current === tag ? "<p>" : `<${tag}>`);
    syncMarks();
  };

  const isEmpty = words === 0;

  const toolButton = (pressed: boolean) =>
    cn(
      "grid size-7 place-items-center rounded-lg transition-colors",
      pressed
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-hover-tint hover:text-foreground",
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="label text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {BLOCKS.map(({ tag, Icon, name, key }) => (
              <button
                key={tag}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyBlock(tag)}
                title={`${name} (Ctrl+Alt+${key})`}
                aria-label={name}
                aria-pressed={block === tag}
                className={toolButton(block === tag)}
              >
                <Icon className="size-4" />
              </button>
            ))}
            <span aria-hidden className="mx-1 h-4 w-px bg-border" />
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
                className={toolButton(active[command])}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
            <span aria-hidden className="mx-1 h-4 w-px bg-border" />
            {(
              [
                ["undo", Undo2Icon, "Undo (Ctrl+Z)", canUndo(history.current ?? undefined)],
                ["redo", Redo2Icon, "Redo (Ctrl+Y)", canRedo(history.current ?? undefined)],
              ] as const
            ).map(([direction, Icon, name, enabled]) => (
              <button
                key={direction}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => step(direction)}
                disabled={!enabled}
                title={name}
                aria-label={name}
                className={cn(toolButton(false), "disabled:pointer-events-none disabled:opacity-35")}
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
            className="pointer-events-none absolute inset-0 whitespace-pre-line p-6 text-base leading-[1.85] text-muted-foreground/70"
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
          onInput={(event) => {
            const native = event.nativeEvent as InputEvent;
            commit(pendingType.current ?? native.inputType ?? "input", native.data ?? null);
          }}
          onKeyUp={syncMarks}
          onMouseUp={syncMarks}
          onFocus={() => {
            // Enter after a heading should start a paragraph, not a <div>.
            document.execCommand("defaultParagraphSeparator", false, "p");
            syncMarks();
          }}
          onKeyDown={(event) => {
            if (!event.ctrlKey && !event.metaKey) return;
            const key = event.key.toLowerCase();
            // Ctrl+Z undoes; Ctrl+Y and Ctrl+Shift+Z redo.
            if (!event.altKey && (key === "z" || key === "y")) {
              event.preventDefault();
              step(key === "y" || event.shiftKey ? "redo" : "undo");
              return;
            }
            if (event.altKey) {
              const target = BLOCKS.find((candidate) => candidate.key === event.key);
              if (target) {
                event.preventDefault();
                applyBlock(target.tag);
              }
              return;
            }
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
            run("paste", "insertText", text);
          }}
          className={cn(
            // A manuscript, not a form field: generous leading and a
            // comfortable measure. `[&_p]` spaces the paragraphs the browser
            // creates as the writer presses Enter.
            //
            // `scroll-mb-*` keeps the caret clear of the fixed action bar: when
            // the browser scrolls the cursor into view it honours the element's
            // scroll margin, so the line being typed never ends up underneath.
            "min-h-[55vh] flex-1 scroll-mb-32 rounded-2xl border border-input bg-card p-6 text-base leading-[1.85] shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring [&_p:not(:last-child)]:mb-4",
            // Headings, sized as the article will show them.
            "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2:first-child]:mt-0",
            "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-snug [&_h3:first-child]:mt-0",
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

type View = LanguageView;

const VIEWS: { value: View; label: string; desktopOnly?: boolean }[] = [
  { value: "en", label: "English" },
  { value: "ta", label: "தமிழ் Tamil" },
  { value: "both", label: "Side by side", desktopOnly: true },
];

/**
 * Bilingual writing surface.
 *
 * One language at a time, at full width, is the default: two half-width boxes
 * made every line wrap after a few words. "Side by side" is still there for
 * translating passage by passage on a wide screen, and the choice is
 * remembered between visits. Both panes stay mounted whichever is showing —
 * they are uncontrolled, so unmounting one would throw away its caret and undo
 * history.
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
  // Shared with every bilingual field in the CMS, and remembered.
  const [view, choose] = useLanguageView();

  const englishParagraphs = splitParagraphs(englishText).length;
  const tamilParagraphs = splitParagraphs(tamilText).length;
  const mismatched =
    englishParagraphs > 0 && tamilParagraphs > 0 && englishParagraphs !== tamilParagraphs;

  const counts: Record<"en" | "ta", number> = {
    en: stats(englishText).words,
    ta: stats(tamilText).words,
  };

  /*
   * "Side by side" is a desktop view. Below `lg` it falls back to English, so
   * a phone never gets two 40-character columns.
   */
  const showEnglish = view === "en" || view === "both";
  const showTamil = view === "ta";
  const paneClass = (visible: boolean, inBoth: boolean) =>
    cn(visible ? "flex" : "hidden", inBoth ? "lg:flex" : visible ? "lg:flex" : "lg:hidden");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Language"
          className="flex gap-1 rounded-full bg-muted p-1"
        >
          {VIEWS.map(({ value, label, desktopOnly }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => choose(value)}
              className={cn(
                "items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                desktopOnly ? "hidden lg:flex" : "flex",
                view === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {value !== "both" && (
                <span className="numeric text-[11px] font-normal text-muted-foreground">
                  {counts[value] > 0 ? `${counts[value]} words` : "empty"}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">
          Enter for a new paragraph · Ctrl+Alt+1 / 2 for a title or subtitle ·
          Ctrl+B / I / U for{" "}
          <strong>bold</strong>, <em>italic</em>,{" "}
          <u className="underline underline-offset-2">underline</u>
        </p>
      </div>

      {/*
        The panes grow with the article and the page scrolls, rather than the
        editor being locked to the viewport with its own inner scrollbar. A
        fixed-height box is fine for a paragraph and miserable for an essay:
        you write into a shrinking slot, and the caret keeps disappearing
        behind the action bar. Grid rows stretch, so the two languages stay the
        same height however unevenly they are translated.
      */}
      <div className={cn("grid gap-4", view === "both" && "lg:grid-cols-2")}>
        <div className={paneClass(showEnglish, view === "both")}>
          <Pane
            key={`en-${hydrationKey}`}
            historyKey={`en-${hydrationKey}`}
            label="English"
            hint="Nothing written yet"
            value={englishText}
            onChange={onEnglishChange}
            placeholder={"Write the post here.\n\nPress Enter to start a new paragraph."}
          />
        </div>
        <div className={paneClass(showTamil, view === "both")}>
          <Pane
            key={`ta-${hydrationKey}`}
            historyKey={`ta-${hydrationKey}`}
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
