import { ArrowDownToLine, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/date";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { DownloadFile } from "@/types/content";

export interface DownloadCardProps {
  file: DownloadFile;
  locale: Locale;
  className?: string;
}

/**
 * A downloadable file.
 *
 * The format tile stands in for a thumbnail — these are documents, so there is
 * no cover image to lead with, and a large "PDF" reads faster than an icon.
 */
export async function DownloadCard({
  file,
  locale,
  className,
}: DownloadCardProps) {
  const [t, tCommon] = await Promise.all([
    getTranslations("downloads"),
    getTranslations("common"),
  ]);

  const title = localize(file.title, locale);
  const description = file.description
    ? localize(file.description, locale)
    : null;

  return (
    <Card
      as="article"
      variant="solid"
      padded="none"
      interactive
      className={cn("flex h-full gap-5 p-5 sm:gap-6 sm:p-6", className)}
    >
      {/*
        The format tile, as a filing tab rather than a gradient chip.

        A document in a parish office is identified by what is written on its
        edge, so the tile is a plain leaf of paper with the format set on it in
        small caps over a rule — the same rule that heads every section. The
        gradient it carried was doing the work of a texture and reading as a
        button.
      */}
      <div
        aria-hidden
        className="relative flex size-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg bg-[var(--surface-muted)] text-brand-800 ring-1 ring-[var(--border)] transition-colors duration-500 group-hover/card:bg-brand-50 group-hover/card:ring-brand-200 sm:size-16"
      >
        <FileText strokeWidth={1.25} className="size-6 sm:size-7" />
        <span className="label text-[0.5rem] leading-none">{file.format}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <CardTitle className="text-lg">{title}</CardTitle>

        {description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}

        <p className="numeric label mt-auto pt-4 text-[var(--muted-foreground)]">
          {t("fileMeta", { format: file.format, size: file.size })}
          <span aria-hidden className="mx-2">
            ·
          </span>
          <time dateTime={file.publishedAt}>
            {formatDate(file.publishedAt, locale)}
          </time>
        </p>
      </div>

      {/* Download affordance — fills in on hover. */}
      <span
        aria-hidden
        className="grid size-10 shrink-0 self-center place-items-center rounded-full bg-sand-100 text-sand-500 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover/card:bg-[var(--primary)] group-hover/card:text-white"
      >
        <ArrowDownToLine className="size-5 transition-transform duration-300 group-hover/card:translate-y-0.5" />
      </span>

      {/*
        A plain anchor, not the i18n Link: this points at a file, not a route,
        and must not be locale-prefixed.
      */}
      <a
        href={file.fileUrl}
        download
        aria-label={`${tCommon("download")}: ${title}`}
        className="absolute inset-0 z-10 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2"
      />
    </Card>
  );
}
