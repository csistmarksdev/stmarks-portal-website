/**
 * F-034: only the message namespaces client components read are serialised
 * into every page. The whole dictionary (every chapter's copy, both meta
 * blocks, the privacy notice...) used to be shipped to the browser on every
 * route, although server components read their strings on the server.
 *
 * Collected from every `useTranslations(...)` call in the source. When a
 * client component starts using a new namespace, add it here - a missing one
 * shows up as next-intl's MISSING_MESSAGE error in that component.
 */
export const CLIENT_NAMESPACES = [
  "common",
  "contact.form",
  "error",
  "gallery.lightbox",
  "home.hero",
  "home.welcomeSequence",
  "nav",
  "scripture",
  "season",
  "site",
] as const;

type Messages = Record<string, unknown>;

/** A copy of `messages` holding only the dotted `paths` given. */
export function pickMessages(messages: Messages, paths: readonly string[]): Messages {
  const out: Messages = {};
  for (const path of paths) {
    const keys = path.split(".");
    let source: unknown = messages;
    for (const key of keys) {
      source = source && typeof source === "object" ? (source as Messages)[key] : undefined;
    }
    if (source === undefined) continue;
    let target = out;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) target[key] = source;
      else target = (target[key] ??= {}) as Messages;
    });
  }
  return out;
}
