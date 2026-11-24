"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentRevision, GalleryAlbum, WithStatus } from "@portal/shared";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { NewGalleryItem } from "@/components/admin/add-gallery-items-dialog";
import { AlbumItemsEditor } from "@/components/admin/album-items-editor";
import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { useApprovalLock } from "@/components/admin/status-select";
import { useResourceItem } from "@/hooks/use-resource";
import { ALBUM_FIELDS } from "@/config/fields";
import { api } from "@/lib/api";

function PhotosManager({ albumId }: { albumId: string }) {
  const apiPath = "/admin/gallery";
  const { data: album } = useResourceItem<WithStatus<GalleryAlbum>>(apiPath, albumId);
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [apiPath] });

  /** One request for the whole batch - the API takes an array of items. */
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
    <AlbumItemsEditor
      items={(album?.photos ?? []).map((photo) => ({ key: photo.id, ...photo }))}
      nameHint={album?.title.en}
      busy={addPhoto.isPending || removePhoto.isPending || reorder.isPending}
      onAdd={(items) =>
        addPhoto
          .mutateAsync(items)
          .then(() => true)
          .catch(() => false)
      }
      onRemove={(index) => album && removePhoto.mutate(album.photos[index].id)}
      onMove={movePhoto}
    />
  );
}

type LocalItem = {
  key: string;
  id?: string;
  image: GalleryAlbum["photos"][number]["image"];
  caption?: GalleryAlbum["photos"][number]["caption"];
  video?: { url: string; provider?: string };
};

export default function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: album } = useResourceItem<
    WithStatus<GalleryAlbum> & { revision?: ContentRevision<GalleryAlbum> }
  >("/admin/gallery", id);
  const { holds } = useApprovalLock(album?.status, true);

  /*
   * Under the approval rule an editor's changes to a live album - photos
   * included - are submitted, not applied. So the photo grid works locally
   * in that case, and when an approver reviews a change that touched the
   * photos; the stream then travels with the save. Otherwise every add,
   * remove and reorder is saved straight away, as before.
   */
  const revisedPhotos = album?.revision?.changes?.photos;
  const local = holds || revisedPhotos !== undefined;
  const [items, setItems] = useState<LocalItem[] | null>(null);
  const nextKey = useRef(0);

  useEffect(() => {
    if (!album || !local) {
      setItems(null);
      return;
    }
    setItems(
      (revisedPhotos ?? album.photos).map((photo) => ({
        ...photo,
        key: photo.id ?? `new-${nextKey.current++}`,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album, local]);

  const move = (index: number, delta: number) =>
    setItems((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <ResourceFormPage
      title="Edit album"
      apiPath="/admin/gallery"
      routeBase="/gallery"
      label="Album"
      fields={ALBUM_FIELDS}
      id={id}
      updateExtras={() =>
        local && items ? { photos: items.map(({ key: _key, ...item }) => item) } : undefined
      }
      belowWriting={
        local && items ? (
          <AlbumItemsEditor
            items={items}
            nameHint={album?.title.en}
            hint={
              holds
                ? "Photo changes are sent with your changes for approval."
                : "These are the submitted photos. Approving applies them."
            }
            onAdd={(added) => {
              setItems((current) => [
                ...(current ?? []),
                ...added.map((item) => ({ ...item, key: `new-${nextKey.current++}` })),
              ]);
              return true;
            }}
            onRemove={(index) =>
              setItems((current) => (current ?? []).filter((_, i) => i !== index))
            }
            onMove={move}
          />
        ) : (
          <PhotosManager albumId={id} />
        )
      }
    />
  );
}
