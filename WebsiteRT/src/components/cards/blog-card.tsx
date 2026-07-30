import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardAction,
  CardBody,
  CardFooter,
  CardMedia,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/date";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/types/content";

export interface BlogCardProps {
  post: BlogPost;
  locale: Locale;
  className?: string;
}

/** A post in the blog index. */
export async function BlogCard({ post, locale, className }: BlogCardProps) {
  const [t, tCommon] = await Promise.all([
    getTranslations("blog"),
    getTranslations("common"),
  ]);

  const title = localize(post.title, locale);

  return (
    <Card
      as="article"
      variant="solid"
      padded="none"
      interactive
      className={cn("flex h-full flex-col overflow-hidden", className)}
    >
      <CardMedia ratio="wide">
        {post.coverImage ? (
          <Image
            src={post.coverImage.url}
            alt={localize(post.coverImage.alt, locale)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-sand-950"
          />
        )}
      </CardMedia>

      <CardBody>
        <p className="numeric label text-[var(--muted-foreground)]">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt, locale)}
          </time>
          {post.readingMinutes ? (
            <>
              <span aria-hidden className="mx-2">
                ·
              </span>
              {t("readingTime", { minutes: post.readingMinutes })}
            </>
          ) : null}
        </p>

        <CardTitle className="mt-3 line-clamp-2">{title}</CardTitle>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {localize(post.excerpt, locale)}
        </p>

        <p className="label mt-5 text-accent-700">
          {t("by", { author: localize(post.author, locale) })}
        </p>

        <CardFooter className="border-t border-sand-200/80">
          <CardAction>
            {tCommon("readMore")}
            <ArrowRight />
          </CardAction>
        </CardFooter>
      </CardBody>

      <Link
        href={ROUTES.blogPost(post.slug)}
        className="absolute inset-0 z-10 rounded-[var(--radius-plate)] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="sr-only">{title}</span>
      </Link>
    </Card>
  );
}
