"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaItem, MediaKind, Paginated } from "@portal/shared";
import { FileIcon, PlayIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default function MediaPage() {
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["media", kind, search, page],
    queryFn: () =>
      api.get<Paginated<MediaItem>>("/admin/media", {
        kind: kind || undefined,
        search: search || undefined,
        page,
        pageSize: 24,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["media"] });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<MediaItem>("/admin/media", formData);
    },
    onSuccess: (item) => {
      toast.success(`Uploaded ${item.filename}`);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/media/${id}`),
    onSuccess: () => {
      toast.success("File deleted");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Assets"
        title="Media library"
        description="Every photo, video, bulletin and document lives here once and is reused everywhere. Images get their thumbnails and blur previews on upload."
        actions={
          can("media.write") ? (
            <>
              <Button
                className="hidden lg:inline-flex"
                onClick={() => fileInput.current?.click()}
                disabled={upload.isPending}
              >
                <UploadIcon /> {upload.isPending ? "Uploading…" : "Upload"}
              </Button>
              <input
                ref={fileInput}
                type="file"
                hidden
                multiple
                onChange={(event) => {
                  for (const file of Array.from(event.target.files ?? [])) {
                    upload.mutate(file);
                  }
                  event.target.value = "";
                }}
              />
            </>
          ) : undefined
        }
      />

      {can("media.write") && (
        <button
          type="button"
          aria-label="Upload files"
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}
          className="bottom-dock fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground [box-shadow:var(--shadow-float)] transition-transform active:scale-95 disabled:opacity-60 lg:hidden"
        >
          <UploadIcon className="size-6" />
        </button>
      )}

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search filenames…"
          className="min-w-0 flex-1 sm:max-w-xs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          className="w-32 shrink-0 sm:w-40"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="pdf">PDFs</option>
          <option value="document">Documents</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data?.items.map((item) => (
              <div key={item.id} className="group overflow-hidden rounded-lg border bg-card">
                <div className="relative aspect-square bg-muted">
                  {item.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl ?? item.url}
                      alt={item.alt?.en ?? item.filename}
                      className="size-full object-cover"
                    />
                  ) : item.kind === "video" ? (
                    <>
                      {/* `preload="metadata"` paints the first frame without
                          pulling the whole clip down. */}
                      <video
                        src={item.url}
                        className="size-full bg-silver-950 object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <span className="pointer-events-none absolute inset-0 grid place-items-center">
                        <span className="grid size-9 place-items-center rounded-full bg-silver-950/60 text-white backdrop-blur-sm">
                          <PlayIcon className="size-4 fill-current" />
                        </span>
                      </span>
                    </>
                  ) : (
                    <div className="grid size-full place-items-center">
                      <FileIcon className="size-10 text-muted-foreground" />
                    </div>
                  )}
                  {can("media.delete") && (
                    <div className="absolute right-1 top-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <ConfirmDialog
                        title="Delete this file?"
                        description="Content that references this file will show a broken link."
                        onConfirm={() => remove.mutateAsync(item.id)}
                        trigger={
                          <Button variant="destructive" size="icon" className="size-7">
                            <Trash2Icon />
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-2">
                  <p className="truncate text-xs font-medium" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <Badge variant="muted">{item.format}</Badge>
                    <span>{item.size}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {data && data.items.length === 0 && (
            <div className="mx-auto max-w-sm py-16 text-center">
              <p className="font-[family-name:var(--font-display)] text-base font-semibold">
                {search || kind ? "Nothing matches" : "The library is empty"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || kind
                  ? "Try a different name or file type."
                  : "Photos from the last festival would be a good start — drag several files onto the upload button at once."}
              </p>
            </div>
          )}
          {data && data.total > data.pageSize && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.total} files — page {data.page} of {Math.ceil(data.total / data.pageSize)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
