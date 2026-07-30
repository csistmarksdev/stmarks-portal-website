import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* PullQuote                                                                  */
/* -------------------------------------------------------------------------- */

export interface PullQuoteProps {
  children: React.ReactNode;
  cite?: string;
  tone?: "default" | "onDark";
  className?: string;
}

/**
 * An oversized display-serif aside lifted out of the running text and hung off
 * a brass rule — the broadsheet pull quote. Purely typographic emphasis; the
 * same words usually appear in the body, so it carries no landmark of its own.
 */
export function PullQuote({
  children,
  cite,
  tone = "default",
  className,
}: PullQuoteProps) {
  const onDark = tone === "onDark";

  return (
    <figure
      className={cn(
        "relative py-2 pl-6 sm:pl-8",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent-500 to-accent-600"
      />
      <blockquote
        className={cn(
          "pull-quote text-2xl leading-snug sm:text-[1.75rem]",
          onDark ? "text-white" : "text-[var(--foreground)]",
        )}
      >
        {children}
      </blockquote>
      {cite ? (
        <figcaption
          className={cn(
            "label mt-4",
            onDark ? "text-accent-200" : "text-accent-700",
          )}
        >
          {cite}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Lead                                                                       */
/* -------------------------------------------------------------------------- */

export interface LeadProps {
  children: React.ReactNode;
  /** Set false to drop the initial cap (e.g. a lead that opens with a numeral). */
  dropCap?: boolean;
  tone?: "default" | "onDark" | "muted";
  className?: string;
}

/**
 * Opening paragraph of a long read, set larger than the body with an initial
 * drop cap (Latin only — the CSS scopes `::first-letter` to `lang="en"`, so
 * Tamil leads render as a plain enlarged paragraph).
 */
export function Lead({
  children,
  dropCap = true,
  tone = "default",
  className,
}: LeadProps) {
  const toneClass =
    tone === "onDark"
      ? "text-white/85"
      : tone === "muted"
        ? "text-[var(--muted-foreground)]"
        : "text-[var(--foreground)]";

  return (
    <p
      className={cn(
        "text-lg leading-relaxed sm:text-xl",
        dropCap && "drop-cap",
        toneClass,
        className,
      )}
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* StatLedger                                                                 */
/* -------------------------------------------------------------------------- */

export interface StatLedgerItem {
  value: string;
  label: string;
}

export interface StatLedgerProps {
  items: StatLedgerItem[];
  tone?: "default" | "onDark";
  className?: string;
}

/**
 * A ruled row of figures — founding year, member count, service count — set as
 * a ledger: big display numerals over small-caps labels, divided by faint
 * column rules the way a printed table rules off its columns.
 */
export function StatLedger({
  items,
  tone = "default",
  className,
}: StatLedgerProps) {
  const onDark = tone === "onDark";

  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4",
        onDark ? "bg-white/10" : "bg-[var(--border)]",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col gap-1 px-5 py-6",
            onDark ? "bg-sand-950" : "bg-[var(--surface)]",
          )}
        >
          <dt className="sr-only">{item.label}</dt>
          <dd
            className={cn(
              "index-num numeric text-3xl sm:text-4xl",
              onDark ? "text-white" : "text-[var(--foreground)]",
            )}
          >
            {item.value}
          </dd>
          <span
            className={cn(
              "label",
              onDark ? "text-accent-200" : "text-accent-700",
            )}
          >
            {item.label}
          </span>
        </div>
      ))}
    </dl>
  );
}
