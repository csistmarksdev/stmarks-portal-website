"use client";

import type { ImageAsset } from "@portal/shared";
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import {
  AddGalleryItemsDialog,
  type NewGalleryItem,
} from "@/components/admin/add-gallery-items-dialog";
import { MediaViewerDialog } from "@/components/admin/media-viewer-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** What the grid needs to draw an item, saved or not yet saved. */
export interface AlbumItemView {
  key: string;
  image: ImageAsset;
  video?: { url: string; provider?: string };
}

/**
 * An album's photos and videos: add, remove, reorder.
 *
 * Purely presentational — the caller decides what each action does. Editing a
 * saved album sends every change to the server at once; a new album keeps them
 * in the page and sends the lot with "Create album", so photos can be chosen
 * before the album exists.
 */
export function AlbumItemsEditor({
  items,
  onAdd,
  onRemove,
  onMove,
  busy = false,
  hint,
  nameHint,
}: {
  items: AlbumItemView[];
  /** Resolve true to close the dialog. */
  onAdd: (items: NewGalleryItem[]) => Promise<boolean> | boolean;
  onRemove: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  busy?: boolean;
  /** Extra line under the description, e.g. that nothing is saved yet. */
  hint?: string;
  /**
   * Names files uploaded here when their own name says nothing (IMG_2041.jpg)
   * — the album title, so the stored file reads `harvest-festival-…jpg`.
   */
  nameHint?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Photos &amp; videos ({items.length})</CardTitle>
          <CardDescription>
            One ordered stream — the website&apos;s lightbox pages through it in this order.
            {hint && <span className="mt-1 block text-accent-fg">{hint}</span>}
          </CardDescription>
        </div>
        {/* One button — photos and video links live behind the same dialog. */}
        <Button type="button" size="sm" className="shrink-0" onClick={() => setPickerOpen(true)}>
          <PlusIcon /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center">
            <p className="text-sm text-muted-foreground">Nothing in this album yet.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setPickerOpen(true)}
            >
              <PlusIcon /> Add photos or a video
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item, index) => (
            <div
              key={item.key}
              className="group relative overflow-hidden rounded-xl border border-border/70"
            >
              <button
                type="button"
                className="block w-full cursor-zoom-in"
                aria-label={`View ${item.video ? "video" : "photo"} ${index + 1}`}
                onClick={() => setViewing(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image.url}
                  alt={item.image.alt?.en ?? ""}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {item.video && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="grid size-11 place-items-center rounded-full bg-black/55 text-white">
                      <PlayIcon className="size-5 fill-current" />
                    </span>
                  </span>
                )}
              </button>
              {item.video && (
                <span
                  className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-sand-950/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
                  title={item.video.url}
                >
                  <PlayIcon className="size-2.5 fill-current" />
                  {item.video.provider ?? "video"}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 p-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20"
                  disabled={index === 0 || busy}
                  onClick={() => onMove(index, -1)}
                  aria-label="Move earlier"
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20"
                  disabled={busy}
                  onClick={() => onRemove(index)}
                  aria-label="Remove"
                >
                  <Trash2Icon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20"
                  disabled={index === items.length - 1 || busy}
                  onClick={() => onMove(index, 1)}
                  aria-label="Move later"
                >
                  <ArrowRightIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <MediaViewerDialog
          items={items}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
        />
        <AddGalleryItemsDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          busy={busy}
          nameHint={nameHint}
          onAdd={async (added) => {
            if (await onAdd(added)) setPickerOpen(false);
          }}
        />
      </CardContent>
    </Card>
  );
}
