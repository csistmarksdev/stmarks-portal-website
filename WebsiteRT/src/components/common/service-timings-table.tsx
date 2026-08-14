import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { ServiceTiming } from "@/types/content";

export interface ServiceTimingsTableProps {
  timings: ServiceTiming[];
  locale: Locale;
  className?: string;
}

/**
 * The week's worship, gathered by day rather than laid out as a spreadsheet.
 *
 * Each day is a band — the day set large in the display serif on the left, its
 * services ruled off beside it with the hour struck in the brand colour and the
 * place set beneath as a quiet line. It reads as an order of the
 * week, the way a printed bulletin lists the services, and keeps its meaning for
 * a screen reader: each day is a heading, each service a list item with its
 * time marked up as a real `<time>`.
 */
export function ServiceTimingsTable({
  timings,
  locale,
  className,
}: ServiceTimingsTableProps) {
  // Group by day, preserving the order each day first appears.
  const groups: { day: ServiceTiming["day"]; items: ServiceTiming[] }[] = [];
  const byKey = new Map<string, number>();

  for (const timing of timings) {
    const key = timing.day.en;
    if (!byKey.has(key)) {
      byKey.set(key, groups.length);
      groups.push({ day: timing.day, items: [] });
    }
    groups[byKey.get(key)!].items.push(timing);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card bg-[var(--surface)] shadow-card ring-1 ring-[var(--border)]",
        className,
      )}
    >
      {groups.map((group) => (
        <section
          key={group.day.en}
          className="grid gap-x-8 gap-y-5 px-6 py-8 sm:px-9 sm:py-9 lg:grid-cols-12 lg:gap-x-12 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[var(--border)]"
        >
          <div className="lg:col-span-3">
            <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {localize(group.day, locale)}
            </h3>
            <span aria-hidden className="mt-3 block h-px w-10 rule-section" />
          </div>

          <ul className="divide-y divide-[var(--border)] lg:col-span-9">
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-7"
              >
                <time className="numeric shrink-0 font-display text-lg font-semibold text-[var(--primary)] sm:w-28">
                  {localize(item.time, locale)}
                </time>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--foreground)]">
                    {localize(item.service, locale)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {localize(item.venue, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
