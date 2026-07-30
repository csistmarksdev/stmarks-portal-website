"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImageAsset, MediaItem, MediaKind, Paginated } from "@portal/shared";
import {
  AlertTriangleIcon,
  CheckIcon,
  FileIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Converts a stored media item to the contract's ImageAsset shape.
 *
 * Alt text is never invented.
 *
 * This used to fall back to the file's name, which put strings like
 * "Scene3.png" into published records — a screen reader then announces
 * "Scene three dot p n g" to a visitor, in both languages, and the record keeps
 * that text forever because it is copied in at selection time. An empty alt is
 * the honest answer for an image nobody has described: assistive technology
 * treats it as decorative and skips it, which is far better than reading out a
 * filename.
 *
 * `ImageAsset.alt` is a required `LocalizedText`, and the API explicitly allows
 * empty strings for exactly this case.
 */
export function mediaToImageAsset(item: MediaItem): ImageAsset {
  return {
    url: item.url,
    alt: item.alt ?? { en: "", ta: "" },
    width: item.width ?? 1600,
    height: item.height ?? 900,
    blurDataURL: item.blurDataURL,
  };
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  kind = "image",
  onSelect,
  multiple = false,
  confirmLabel = "Add",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: MediaKind;
  /** Called with one item, or with everything ticked when `multiple`. */
  onSelect: (items: MediaItem[]) => void;
  /** Tick several items and confirm once — for filling an album in one go. */
  multiple?: boolean;
  confirmLabel?: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Keyed by id so a selection survives paging and re-filtering.
  const [picked, setPicked] = useState<Record<string, MediaItem>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const pickedList = Object.values(picked);

  // Start each visit with a clean slate.
  useEffect(() => {
    if (!open) setPicked({});
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["media", kind, page, search],
    queryFn: () =>
      api.get<Paginated<MediaItem>>("/admin/media", {
        kind,
        page,
        pageSize: 24,
        search: search || undefined,
      }),
    enabled: open,
  });

  const toggle = (item: MediaItem) => {
    setPicked((current) => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  };

  const choose = (item: MediaItem) => {
    if (multiple) toggle(item);
    else {
      onSelect([item]);
      onOpenChange(false);
    }
  };

  /** Uploads run in parallel; whatever lands is added to the selection. */
  const upload = useMutation({
    mutationFn: (files: File[]) =>
      Promise.all(
        files.map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          return api.upload<MediaItem>("/admin/media", formData);
        }),
      ),
    onSuccess: (items) => {
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success(
        items.length === 1 ? `Uploaded ${items[0].filename}` : `Uploaded ${items.length} files`,
      );
      if (multiple) {
        setPicked((current) => ({
          ...current,
          ...Object.fromEntries(items.map((item) => [item.id, item])),
        }));
      } else {
        onSelect(items.slice(0, 1));
        onOpenChange(false);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by filename…"
            className="max-w-xs"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
          >
            <UploadIcon />{" "}
            {upload.isPending
              ? "Uploading…"
              : multiple
                ? "Upload files"
                : "Upload new"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            hidden
            multiple={multiple}
            accept={kind === "image" ? "image/*" : kind === "pdf" ? "application/pdf" : undefined}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) upload.mutate(files);
              event.target.value = "";
            }}
          />
          {multiple && (
            <p className="text-xs text-muted-foreground">
              Tick as many as you need — you can pick several at once.
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {data?.items.map((item) => {
                const isPicked = Boolean(picked[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={multiple ? isPicked : undefined}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all hover:ring-2 hover:ring-ring",
                      isPicked && "ring-2 ring-primary ring-offset-2",
                    )}
                    onClick={() => choose(item)}
                    title={item.filename}
                  >
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl ?? item.url}
                        alt={item.alt?.en ?? item.filename}
                        className={cn(
                          "size-full object-cover transition-transform",
                          isPicked && "scale-95",
                        )}
                      />
                    ) : (
                      <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
                        <FileIcon className="size-6 text-muted-foreground" />
                        <span className="line-clamp-2 text-[10px] text-muted-foreground">
                          {item.filename}
                        </span>
                        <span className="text-[10px] font-medium">{item.format}</span>
                      </span>
                    )}
                    {multiple && (
                      <span
                        className={cn(
                          "absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full border transition-colors",
                          isPicked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/70 bg-silver-950/30 text-transparent backdrop-blur-sm",
                        )}
                      >
                        <CheckIcon className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {data && data.items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing here yet — upload a file to get started.
              </p>
            )}
            {data && data.total > data.pageSize && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {data.page} of {Math.ceil(data.total / data.pageSize)}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {multiple && (
          <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-3 border-t bg-card/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
            <span className="text-sm text-muted-foreground">
              {pickedList.length === 0
                ? "Nothing selected"
                : `${pickedList.length} selected`}
            </span>
            <div className="flex gap-2">
              {pickedList.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPicked({})}>
                  Clear
                </Button>
              )}
              <Button
                type="button"
                disabled={pickedList.length === 0}
                onClick={() => {
                  onSelect(pickedList);
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
                {pickedList.length > 0 ? ` ${pickedList.length}` : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Form control for optional/required `ImageAsset` fields. */
export function ImagePicker({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value?: ImageAsset;
  onChange: (next: ImageAsset | undefined) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {value ? (
        <div className="flex items-center gap-3 rounded-md border p-2">
          <div className="relative size-16 shrink-0 overflow-hidden rounded bg-muted">
            <Image
              src={value.url}
              alt={value.alt?.en ?? ""}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            <p className="truncate">{value.url}</p>
            <p>
              {value.width} × {value.height}
            </p>
            {/*
              Surfaced rather than silently accepted: an undescribed image is
              invisible to anyone using a screen reader, and nothing else in the
              flow would ever mention it.
            */}
            {!value.alt?.en?.trim() && (
              <p className="mt-1 flex items-center gap-1.5 text-accent-fg">
                <AlertTriangleIcon className="size-3.5 shrink-0" />
                No alt text — add one in the media library
              </p>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Change
          </Button>
          {!required && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => onChange(undefined)}
            >
              <XIcon />
            </Button>
          )}
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Choose image…
        </Button>
      )}
      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        kind="image"
        onSelect={(items) => items[0] && onChange(mediaToImageAsset(items[0]))}
      />
    </div>
  );
}
