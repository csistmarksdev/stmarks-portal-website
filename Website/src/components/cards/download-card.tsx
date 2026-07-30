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
      {/* Format tile */}
      <div
        aria-hidden
        className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 ring-1 ring-brand-100 transition-colors duration-500 group-hover/card:from-brand-100 group-hover/card:to-brand-200 sm:size-16"
      >
        <FileText className="size-6 sm:size-7" />
        <span className="absolute bottom-1.5 text-[0.5625rem] font-bold uppercase tracking-wider">
          {file.format}
        </span>
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
        className="absolute inset-0 z-10 rounded-[var(--radius-plate)] focus-visible:outline-2 focus-visible:outline-offset-2"
      />
    </Card>
  );
}
