"use client";

import type { ImageAsset } from "@portal/shared";
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readVideoUrl } from "@/lib/video";

export interface ViewerItem {
  image: ImageAsset;
  video?: { url: string; provider?: string };
}

/** The last part of a URL: the file's name as search engines see it. */
function fileName(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url.split("/").pop() ?? url;
  }
}

/** A name that is only an id (a UUID) tells image search nothing. */
const ID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

/**
 * Full-size view of one album item — the photo, or the video playing as the
 * website will play it — with its link and file name. Arrow keys and the
 * buttons page through the album.
 */
export function MediaViewerDialog({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: ViewerItem[];
  /** The item on screen, or null when closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null && index < items.length;
  const item = open ? items[index] : null;
  const verdict = item?.video ? readVideoUrl(item.video.url) : null;

  useEffect(() => {
    if (!open || index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items.length, onIndexChange]);

  if (!item || index === null) return <Dialog open={false} />;

  const imageName = fileName(item.image.url);
  const links = [
    ...(item.video ? [{ label: verdict?.provider ?? "Video", url: item.video.url }] : []),
    { label: item.video ? "Poster image" : "Image", url: item.image.url },
  ];

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>
            {item.video ? "Video" : "Photo"} {index + 1} of {items.length}
          </DialogTitle>
          <DialogDescription>
            {item.image.alt?.en?.trim() || "No alt text yet — add it in the media library."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl bg-black">
          {verdict?.embed ? (
            <iframe
              key={verdict.embed}
              src={verdict.embed}
              title={`Video ${index + 1}`}
              className="aspect-video w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : item.video && !verdict?.problem ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={item.video.url}
              src={item.video.url}
              poster={item.image.url}
              controls
              autoPlay
              className="aspect-video w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image.url}
              alt={item.image.alt?.en ?? ""}
              className="max-h-[65vh] w-full object-contain"
            />
          )}
        </div>
        {verdict?.problem && <p className="text-sm text-destructive">{verdict.problem}</p>}

        <div className="space-y-1.5">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-1.5 break-all text-xs text-primary hover:underline"
            >
              <ExternalLinkIcon className="mt-0.5 size-3 shrink-0" />
              <span>
                <span className="font-medium">{link.label}:</span> {link.url}
              </span>
            </a>
          ))}
          <p className="text-xs text-muted-foreground">
            File name: <span className="font-mono">{imageName}</span>
            {ID_ONLY.test(imageName) &&
              " — an id rather than words. New uploads are named from their alt text or the album title, which helps image search."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => onIndexChange(index - 1)}
          >
            <ChevronLeftIcon /> Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index === items.length - 1}
            onClick={() => onIndexChange(index + 1)}
          >
            Next <ChevronRightIcon />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
