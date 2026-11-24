"use client";

import {
  SEO_LIMITS,
  type ImageAsset,
  type LocalizedText,
  type LocalizedTextOptional,
  type SeoMeta,
} from "@portal/shared";
import {
  PlayIcon,
  SearchIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { visibleLanguages } from "@/components/admin/localized-field";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguageView } from "@/lib/language-view";
import { cn } from "@/lib/utils";
import { readVideoUrl, videoThumbnail } from "@/lib/video";

/** The website's public origin, for the search-result preview only. */
const SITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://www.csistmarks.com").replace(
  /\/+$/,
  "",
);

/** Turns whatever was typed into the keyword list the API stores. */
export function cleanKeywords(list: string[]): string[] {
  const seen = new Set<string>();
  for (const item of list) {
    const keyword = item.trim().replace(/\s+/g, " ").toLowerCase();
    if (keyword) seen.add(keyword.slice(0, SEO_LIMITS.keywordLength));
  }
  return [...seen].slice(0, SEO_LIMITS.keywords);
}

const hasText = (value?: LocalizedTextOptional) => !!(value?.en?.trim() || value?.ta?.trim());

/**
 * The SEO block as the API wants it: `null` when nothing is set (so an edit
 * clears what was there), otherwise only the parts that carry text.
 */
export function seoPayload(value: SeoMeta | undefined | null): SeoMeta | null {
  if (!value) return null;
  const keywords = cleanKeywords(value.keywords ?? []);
  const out: SeoMeta = {};
  if (hasText(value.title)) out.title = { en: value.title?.en?.trim() ?? "", ta: value.title?.ta?.trim() ?? "" };
  if (hasText(value.description)) {
    out.description = {
      en: value.description?.en?.trim() ?? "",
      ta: value.description?.ta?.trim() ?? "",
    };
  }
  if (keywords.length) out.keywords = keywords;
  if (value.image) out.image = value.image;
  if (value.video?.url?.trim()) out.video = { url: value.video.url.trim() };
  return Object.keys(out).length ? out : null;
}

function Counter({ length, limit }: { length: number; limit: number }) {
  return (
    <span
      className={cn(
        "text-[11px] tabular-nums",
        length > limit ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length}/{limit}
    </span>
  );
}

function LocalizedSeoText({
  label,
  hint,
  limit,
  value,
  fallback,
  multiline,
  onChange,
}: {
  label: string;
  hint: string;
  limit: number;
  value?: LocalizedTextOptional;
  fallback?: LocalizedText;
  multiline?: boolean;
  onChange: (next: LocalizedTextOptional) => void;
}) {
  const [view] = useLanguageView();
  const both = view === "both";
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className={cn("grid gap-x-3 gap-y-2", both && "md:grid-cols-2")}>
        {visibleLanguages(view).map(({ locale, caption }) => {
          const text = value?.[locale] ?? "";
          return (
            <label key={locale} className="flex flex-col gap-1">
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{both ? caption : ""}</span>
                <Counter length={text.length} limit={limit} />
              </span>
              <AutoTextarea
                lang={locale}
                aria-label={`${label} — ${caption}`}
                singleLine={!multiline}
                minRows={multiline ? 2 : 1}
                stretch={both}
                placeholder={fallback?.[locale] || hint}
                value={text}
                onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
              />
            </label>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

function KeywordsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [typing, setTyping] = useState("");
  const full = value.length >= SEO_LIMITS.keywords;

  const commit = (text: string) => {
    if (!text.trim()) return;
    onChange(cleanKeywords([...value, ...text.split(",")]));
    setTyping("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(typing);
    } else if (event.key === "Backspace" && !typing && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label>Keywords</Label>
        <Counter length={value.length} limit={SEO_LIMITS.keywords} />
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
              {keyword}
              <button
                type="button"
                aria-label={`Remove keyword ${keyword}`}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={() => onChange(value.filter((item) => item !== keyword))}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={typing}
        disabled={full}
        placeholder={full ? "Keyword limit reached" : "Type a keyword and press Enter or comma"}
        onChange={(event) => setTyping(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(typing)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (pasted.includes(",")) {
            event.preventDefault();
            commit(typing + pasted);
          }
        }}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Words and short phrases people search for, e.g. “christmas carol service”, “csi church
        chennai”. Saved in lowercase.
      </p>
    </div>
  );
}

/** The video as it will play on the site: embedded player or HTML5 video. */
function VideoPreview({ url }: { url: string }) {
  const verdict = readVideoUrl(url);
  if (!verdict || verdict.problem) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-black">
      {verdict.embed ? (
        <iframe
          src={verdict.embed}
          title="Video preview"
          className="aspect-video w-full"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={url} controls preload="metadata" className="aspect-video w-full" />
      )}
    </div>
  );
}

/**
 * Search-engine settings for a record with a public page: the title and
 * description shown in search results, and meta keywords. Each part is
 * optional — left blank, the website uses the record's own title and
 * summary — and a live preview shows what a search result would look like.
 */
export function SeoFields({
  value,
  onChange,
  urlPath,
  fallbackTitle,
  fallbackDescription,
  fallbackImage,
}: {
  value?: SeoMeta | null;
  onChange: (next: SeoMeta) => void;
  /** The page's path on the website, e.g. `/events/harvest-2026`. */
  urlPath: string;
  fallbackTitle?: LocalizedText;
  fallbackDescription?: LocalizedText;
  /** The record's own cover/image — what is shared when no share image is set. */
  fallbackImage?: ImageAsset;
}) {
  const current = value ?? {};
  const shareImage =
    current.image?.url ??
    fallbackImage?.url ??
    (current.video?.url ? videoThumbnail(current.video.url) : null);
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const previewTitle = current.title?.en?.trim() || fallbackTitle?.en || "Page title";
  const previewDescription =
    current.description?.en?.trim() ||
    fallbackDescription?.en ||
    "A short description of this page for search results.";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Google-style result, with the thumbnail search engines show beside it. */}
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <SearchIcon className="size-3" /> Search result preview
          </p>
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-all text-xs text-muted-foreground">
                {SITE_URL}
                {urlPath}
              </p>
              <p className="mt-0.5 line-clamp-2 text-base font-medium text-primary">
                {previewTitle}
              </p>
              <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">
                {previewDescription}
              </p>
            </div>
            {shareImage && (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shareImage} alt="" className="size-full object-cover" />
                {current.video?.url && (
                  <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                    <PlayIcon className="size-6 fill-current" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* How the link looks when shared on WhatsApp, Facebook, X… */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/30">
          <p className="flex items-center gap-1.5 px-4 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Share2Icon className="size-3" /> Shared link preview
          </p>
          <div className="m-3 overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="relative aspect-[1.91/1] bg-muted">
              {shareImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shareImage} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-xs text-muted-foreground">
                  The website's default image
                </div>
              )}
              {current.video?.url && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-full bg-black/60 text-white">
                    <PlayIcon className="size-6 fill-current" />
                  </span>
                </span>
              )}
            </div>
            <div className="space-y-0.5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{host}</p>
              <p className="line-clamp-1 text-sm font-semibold">{previewTitle}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{previewDescription}</p>
            </div>
          </div>
        </div>
      </div>

      {current.video?.url && <VideoPreview url={current.video.url} />}

      <LocalizedSeoText
        label="SEO title"
        hint="Shown as the headline in search results and when shared. Leave blank to use the title."
        limit={SEO_LIMITS.title}
        value={current.title}
        fallback={fallbackTitle}
        onChange={(title) => onChange({ ...current, title })}
      />
      <LocalizedSeoText
        label="Meta description"
        hint="One or two sentences under the headline in search results. Leave blank to use the summary."
        limit={SEO_LIMITS.description}
        value={current.description}
        fallback={fallbackDescription}
        multiline
        onChange={(description) => onChange({ ...current, description })}
      />
      <KeywordsInput
        value={current.keywords ?? []}
        onChange={(keywords) => onChange({ ...current, keywords })}
      />

    </div>
  );
}
