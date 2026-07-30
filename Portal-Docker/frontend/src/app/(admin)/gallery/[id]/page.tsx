"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GalleryAlbum, WithStatus } from "@portal/shared";
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { use, useState } from "react";
import { toast } from "sonner";

import {
  AddGalleryItemsDialog,
  type NewGalleryItem,
} from "@/components/admin/add-gallery-items-dialog";
import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResourceItem } from "@/hooks/use-resource";
import { ALBUM_FIELDS } from "@/config/fields";
import { api } from "@/lib/api";

function PhotosManager({ albumId }: { albumId: string }) {
  const apiPath = "/admin/gallery";
  const { data: album } = useResourceItem<WithStatus<GalleryAlbum>>(apiPath, albumId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [apiPath] });

  /** One request for the whole batch — the API takes an array of items. */
  const addPhoto = useMutation({
    mutationFn: (items: NewGalleryItem[]) =>
      api.post(`${apiPath}/${albumId}/photos`, { photos: items }),
    onSuccess: (_data, items) => {
      toast.success(
        items[0]?.video
          ? "Video added"
          : items.length === 1
            ? "Photo added"
            : `${items.length} photos added`,
      );
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removePhoto = useMutation({
    mutationFn: (photoId: string) =>
      api.delete(`${apiPath}/${albumId}/photos/${photoId}`),
    onSuccess: () => {
      toast.success("Photo removed");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorder = useMutation({
    mutationFn: (photoIds: string[]) =>
      api.patch(`${apiPath}/${albumId}/photos/reorder`, { photoIds }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const movePhoto = (index: number, delta: number) => {
    if (!album) return;
    const ids = album.photos.map((photo) => photo.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <Card className="mx-auto mt-6 max-w-3xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Photos &amp; videos ({album?.photos.length ?? 0})</CardTitle>
          <CardDescription>
            One ordered stream — the website&apos;s lightbox pages through it in
            this order.
          </CardDescription>
        </div>
        {/* One button — photos and video links live behind the same dialog. */}
        <Button type="button" size="sm" className="shrink-0" onClick={() => setPickerOpen(true)}>
          <PlusIcon /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {album && album.photos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing in this album yet.
            </p>
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
          {album?.photos.map((photo, index) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image.url}
                alt={photo.image.alt?.en ?? ""}
                className="aspect-square w-full object-cover"
              />
              {photo.video && (
                <span
                  className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-silver-950/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
                  title={photo.video.url}
                >
                  <PlayIcon className="size-2.5 fill-current" />
                  {photo.video.provider ?? "video"}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 p-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20"
                  disabled={index === 0}
                  onClick={() => movePhoto(index, -1)}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20"
                  onClick={() => removePhoto.mutate(photo.id)}
                >
                  <Trash2Icon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20"
                  disabled={!album || index === album.photos.length - 1}
                  onClick={() => movePhoto(index, 1)}
                >
                  <ArrowRightIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <AddGalleryItemsDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          busy={addPhoto.isPending}
          onAdd={(items) =>
            addPhoto.mutate(items, { onSuccess: () => setPickerOpen(false) })
          }
        />
      </CardContent>
    </Card>
  );
}

export default function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div>
      <ResourceFormPage
        title="Edit album"
        apiPath="/admin/gallery"
        routeBase="/gallery"
        label="Album"
        fields={ALBUM_FIELDS}
        id={id}
      />
      <PhotosManager albumId={id} />
    </div>
  );
}
