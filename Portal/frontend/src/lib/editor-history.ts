/**
 * Undo / redo for the contenteditable body editor.
 *
 * The browser's own undo stack is not usable here. Chrome's history for a
 * contenteditable is patchy once `execCommand` formatting and plain-text paste
 * are in the mix - Ctrl+Z often does nothing, or rewinds far more than the last
 * edit - and it dies with the element, so leaving the Write step and coming
 * back wiped it. This keeps snapshots of the editor instead: the HTML plus the
 * caret as character offsets, which is all a restore needs.
 *
 * Histories live in a module-level map keyed per post and language, so they
 * survive the pane unmounting when the writer steps to Presentation and back.
 */

export interface Snapshot {
  html: string;
  /** Caret / selection as character offsets into the editor's text. */
  start: number;
  end: number;
}

export interface History {
  states: Snapshot[];
  index: number;
  /** When the top state was last extended by typing, for grouping. */
  lastTypedAt: number;
  lastInputType: string;
}

const LIMIT = 300;

/** Consecutive typing within this gap undoes as one step. */
const GROUP_MS = 1000;

const histories = new Map<string, History>();

export function getHistory(key: string): History | undefined {
  return histories.get(key);
}

export function startHistory(key: string, initial: Snapshot): History {
  const history: History = {
    states: [initial],
    index: 0,
    lastTypedAt: 0,
    lastInputType: "",
  };
  histories.set(key, history);
  return history;
}

/** Typing-like input that may fold into the previous step. */
function isGroupable(inputType: string): boolean {
  return inputType === "insertText" || inputType.startsWith("delete");
}

/**
 * Records the editor's current state. Typing in a burst extends the top step
 * instead of adding one per character; anything else - Enter, paste,
 * formatting, a pause - starts a new step.
 */
export function record(
  history: History,
  snapshot: Snapshot,
  inputType: string,
  /** The text typed, if any - a space or newline closes the current group. */
  data: string | null = null,
): void {
  const top = history.states[history.index];
  if (top && top.html === snapshot.html) {
    // Nothing changed (a mark toggled on an empty selection, say): just keep
    // the caret current so an undo back to here lands sensibly.
    history.states[history.index] = snapshot;
    return;
  }

  const now = Date.now();
  const extend =
    history.index > 0 &&
    isGroupable(inputType) &&
    inputType === history.lastInputType &&
    now - history.lastTypedAt < GROUP_MS &&
    history.index === history.states.length - 1;

  // A fresh edit after an undo discards the redo branch.
  history.states.length = history.index + 1;

  if (extend) {
    history.states[history.index] = snapshot;
  } else {
    history.states.push(snapshot);
    if (history.states.length > LIMIT) history.states.shift();
    history.index = history.states.length - 1;
  }

  history.lastTypedAt = now;
  // A word boundary closes the group, so undo takes back words, not lines.
  history.lastInputType = data !== null && /\s/.test(data) ? "" : inputType;
}

export function undo(history: History): Snapshot | null {
  if (history.index === 0) return null;
  history.index -= 1;
  history.lastInputType = "";
  return history.states[history.index];
}

export function redo(history: History): Snapshot | null {
  if (history.index >= history.states.length - 1) return null;
  history.index += 1;
  history.lastInputType = "";
  return history.states[history.index];
}

export const canUndo = (history: History | undefined) => !!history && history.index > 0;
export const canRedo = (history: History | undefined) =>
  !!history && history.index < history.states.length - 1;

/* -------------------------------------------------------------------------- */
/* Caret ⇄ character offsets                                                  */
/* -------------------------------------------------------------------------- */

function offsetOf(root: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

/** The current selection inside `root`, as text offsets. */
export function readSelection(root: HTMLElement): { start: number; end: number } {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return { start: 0, end: 0 };
  return {
    start: offsetOf(root, range.startContainer, range.startOffset),
    end: offsetOf(root, range.endContainer, range.endOffset),
  };
}

function pointAt(root: HTMLElement, target: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = target;
  let last: Text | null = null;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const length = node.data.length;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
    last = node;
  }
  // Past the end (or no text at all): park at the very end.
  if (last) return { node: last, offset: last.data.length };
  return { node: root, offset: root.childNodes.length };
}

/** Puts the caret / selection back at the given text offsets. */
export function writeSelection(root: HTMLElement, start: number, end: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  const from = pointAt(root, start);
  const to = start === end ? from : pointAt(root, end);
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}
