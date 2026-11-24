"use client";

import { useRef, useState } from "react";

import type { NewGalleryItem } from "@/components/admin/add-gallery-items-dialog";
import { AlbumItemsEditor } from "@/components/admin/album-items-editor";
import { ResourceFormPage } from "@/components/admin/resource-form-page";
import { ALBUM_FIELDS } from "@/config/fields";

/**
 * A new album is filled in whole - words, cover and photos - and created in
 * one step. Photos picked here are held in the page and sent with "Create
 * album"; there is no need to create an empty album first and come back.
 */
export default function NewAlbumPage() {
  const [items, setItems] = useState<Array<NewGalleryItem & { key: string }>>([]);
  // Keys for the grid. Not `crypto.randomUUID`: that exists only on secure
  // pages, and the Portal is often opened over plain http on the church LAN.
  const nextKey = useRef(0);

  const move = (index: number, delta: number) =>
    setItems((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <ResourceFormPage
      title="New album"
      apiPath="/admin/gallery"
      routeBase="/gallery"
      label="Album"
      fields={ALBUM_FIELDS}
      defaults={{ shared: false }}
      createExtras={() =>
        items.length > 0 ? { photos: items.map(({ image, video }) => ({ image, video })) } : {}
      }
      belowWriting={
        <AlbumItemsEditor
          items={items}
          hint={items.length > 0 ? "Saved with the album when you create it." : undefined}
          onAdd={(added) => {
            setItems((current) => [
              ...current,
              ...added.map((item) => ({ ...item, key: `new-${nextKey.current++}` })),
            ]);
            return true;
          }}
          onRemove={(index) => setItems((current) => current.filter((_, i) => i !== index))}
          onMove={move}
        />
      }
    />
  );
}
