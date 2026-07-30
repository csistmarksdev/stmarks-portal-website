"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImageAsset, MediaItem, Paginated } from "@portal/shared";
import { CheckIcon, ImageIcon, LinkIcon, PlayIcon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { mediaToImageAsset } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface NewGalleryItem {
  image: ImageAsset;
  video?: { url: string };
}

/**
 * Mirrors the Website's player so the admin gets the same verdict the site
 * will reach — a hosted link with no extractable id renders an empty player
 * there, which is impossible to diagnose after the fact.
 */
function readUrl(raw: string) {
  const url = raw.trim();
  if (!url) return null;

  if (/(?:youtube\.com|youtu\.be)/i.test(url)) {
    const id = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1];
    return {
      provider: "YouTube",
      hosted: true,
      // The same privacy-preserving host the Website embeds from, so what
      // plays here is exactly what a visitor will get.
      embed: id
        ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
        : null,
      problem: id
        ? null
        : "That YouTube link has no video id — copy it from the address bar or the Share button.",
    };
  }
  if (/vimeo\.com/i.test(url)) {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return {
      provider: "Vimeo",
      hosted: true,
      embed: id ? `https://player.vimeo.com/video/${id}` : null,
      problem: id
        ? null
        : "That Vimeo link has no video id — it should look like vimeo.com/123456789.",
    };
  }
  try {
    new URL(url);
    return { provider: "video file", hosted: false, embed: null, problem: null };
  } catch {
    return {
      provider: "video file",
      hosted: false,
      embed: null,
      problem: "That is not a full web address.",
    };
  }
}

/**
 * One dialog for everything that can go into an album: pick or upload photos,
 * or paste a video link. Replaces a two-step flow where choosing "video"
 * opened a bare media library with no hint that it wanted a poster frame and
 * nowhere to put the URL.
 */
export function AddGalleryItemsDialog({
  open,
  onOpenChange,
  onAdd,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (items: NewGalleryItem[]) => void;
  busy?: boolean;
}) {
  const [tab, setTab] = useState<"photos" | "video">("photos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Record<string, MediaItem>>({});
  const [videoUrl, setVideoUrl] = useState("");
  const [poster, setPoster] = useState<MediaItem | null>(null);
  /*
   * Not auto-played: three embeds mounting as someone types a URL character by
   * character is a lot of third-party script for no gain, and an unrequested
   * video starting on its own is obnoxious. It loads when asked.
   */
  const [showPreview, setShowPreview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const pickedList = Object.values(picked);
  const verdict = readUrl(videoUrl);

  useEffect(() => {
    if (open) return;
    setPicked({});
    setVideoUrl("");
    setPoster(null);
    setShowPreview(false);
    setTab("photos");
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["media", "image", page, search],
    queryFn: () =>
      api.get<Paginated<MediaItem>>("/admin/media", {
        kind: "image",
        page,
        pageSize: 18,
        search: search || undefined,
      }),
    enabled: open && tab === "photos",
  });

  const upload = useMutation({
    mutationFn: (files: File[]) =>
      Promise.all(
        files.map((file) => {
          const body = new FormData();
          body.append("file", file);
          return api.upload<MediaItem>("/admin/media", body);
        }),
      ),
    onSuccess: (items) => {
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      setPicked((current) => ({
        ...current,
        ...Object.fromEntries(items.map((item) => [item.id, item])),
      }));
      toast.success(
        items.length === 1 ? "1 photo uploaded and selected" : `${items.length} photos uploaded and selected`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /** Pulls the clip's own thumbnail so a link is all the admin has to supply. */
  const fetchPoster = useMutation({
    mutationFn: (url: string) =>
      api.post<MediaItem>("/admin/media/video-poster", { url }),
    onSuccess: (item) => {
      setPoster(item);
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });

  /** Uploads a video file and points the URL box at where it now lives. */
  const uploadVideo = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api.upload<MediaItem>("/admin/media", body);
    },
    onSuccess: (item) => {
      setVideoUrl(item.url);
      setPoster(null);
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Video uploaded — now choose a poster image");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const uploadPoster = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api.upload<MediaItem>("/admin/media", body);
    },
    onSuccess: (item) => {
      setPoster(item);
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // A hosted link can fetch its own poster the moment the URL looks valid.
  useEffect(() => {
    if (tab !== "video" || !verdict || verdict.problem || !verdict.hosted) return;
    const url = videoUrl.trim();
    const timer = setTimeout(() => fetchPoster.mutate(url), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, tab]);

  const canAddVideo = Boolean(verdict && !verdict.problem && poster);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to album</DialogTitle>
          <DialogDescription>
            Photos and videos share one order on the website.
          </DialogDescription>
        </DialogHeader>

        {/* Two ways in, both visible from the start. */}
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(
            [
              ["photos", "Photos", ImageIcon],
              ["video", "Video or YouTube link", LinkIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                tab === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "photos" ? (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Search photos…"
                className="min-w-0 flex-1"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
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
                accept="image/*"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length) upload.mutate(files);
                  event.target.value = "";
                }}
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : data && data.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border-strong py-10 text-center text-sm text-muted-foreground">
                {search ? "No photos match that name." : "No photos yet — upload some above."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {data?.items.map((item) => {
                  const isPicked = Boolean(picked[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isPicked}
                      title={item.filename}
                      onClick={() =>
                        setPicked((current) => {
                          const next = { ...current };
                          if (next[item.id]) delete next[item.id];
                          else next[item.id] = item;
                          return next;
                        })
                      }
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all",
                        isPicked ? "ring-2 ring-primary ring-offset-2" : "hover:ring-2 hover:ring-ring",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnailUrl ?? item.url}
                        alt={item.alt?.en ?? item.filename}
                        className="size-full object-cover"
                      />
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
                    </button>
                  );
                })}
              </div>
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

            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <span className="text-sm text-muted-foreground">
                {pickedList.length === 0 ? "Nothing selected" : `${pickedList.length} selected`}
              </span>
              <Button
                type="button"
                disabled={pickedList.length === 0 || busy}
                onClick={() =>
                  onAdd(pickedList.map((item) => ({ image: mediaToImageAsset(item) })))
                }
              >
                Add {pickedList.length > 0 ? pickedList.length : ""}{" "}
                {pickedList.length === 1 ? "photo" : "photos"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Two equal routes: upload a file from this device, or paste a link. */}
            <div className="rounded-2xl border border-dashed border-border-strong p-4 text-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInput.current?.click()}
                disabled={uploadVideo.isPending}
              >
                <UploadIcon />{" "}
                {uploadVideo.isPending ? "Uploading video…" : "Upload a video file"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                MP4, WebM, OGG or MOV from this device.
              </p>
              <input
                ref={videoInput}
                type="file"
                hidden
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadVideo.mutate(file);
                  event.target.value = "";
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="label text-muted-foreground">or paste a link</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-1.5">
              <Input
                autoFocus
                placeholder="https://youtu.be/… , vimeo.com/… or a .mp4 address"
                value={videoUrl}
                onChange={(event) => {
                  setVideoUrl(event.target.value);
                  setPoster(null);
                  // Editing the URL invalidates whatever was on screen.
                  setShowPreview(false);
                }}
              />
              {verdict?.problem ? (
                <p className="text-xs text-destructive">{verdict.problem}</p>
              ) : verdict ? (
                <p className="text-xs text-muted-foreground">
                  Recognised as a <strong>{verdict.provider}</strong>
                  {verdict.hosted ? " — fetching its thumbnail…" : " — choose a poster image below."}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  YouTube and Vimeo links fetch their own thumbnail; an uploaded
                  file needs a poster image you choose.
                </p>
              )}
            </div>

            {verdict && !verdict.problem && (
              <div className="flex items-center gap-4 rounded-2xl border p-3">
                <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                  {fetchPoster.isPending || uploadPoster.isPending ? (
                    <Skeleton className="size-full" />
                  ) : poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster.thumbnailUrl ?? poster.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Poster frame</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {poster
                      ? "Shown in the album grid before the video plays."
                      : fetchPoster.isPending
                        ? "Fetching from the video…"
                        : verdict.hosted
                          ? "Could not fetch one automatically — upload an image instead."
                          : "A video file has no thumbnail; upload one."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => posterInput.current?.click()}
                    disabled={uploadPoster.isPending}
                  >
                    <UploadIcon /> {poster ? "Use a different image" : "Upload a poster"}
                  </Button>
                  <input
                    ref={posterInput}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadPoster.mutate(file);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
            )}

            {/*
              Play it before saving.

              A link can look perfectly valid and still be unembeddable — the
              owner disabled embedding, the video is private, or it was deleted.
              None of that is visible in the URL, and the thumbnail fetch does
              not prove it either. The only honest check is to play the thing,
              so the editor sees exactly what a visitor will.
            */}
            {verdict && !verdict.problem && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="label text-muted-foreground">Preview</p>
                  {!showPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                    >
                      <PlayIcon /> Play it
                    </Button>
                  )}
                </div>

                {showPreview ? (
                  <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-border">
                    {verdict.embed ? (
                      <iframe
                        key={verdict.embed}
                        src={verdict.embed}
                        title="Video preview"
                        allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="aspect-video w-full"
                      />
                    ) : (
                      <video
                        key={videoUrl}
                        src={videoUrl.trim()}
                        poster={poster?.url}
                        controls
                        playsInline
                        className="aspect-video w-full bg-black"
                      />
                    )}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border-strong px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    A link can be valid and still refuse to embed — private,
                    deleted, or embedding turned off by the owner. Play it here
                    to be sure before it reaches the website.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canAddVideo || busy}
                onClick={() => {
                  if (!poster) return;
                  onAdd([
                    { image: mediaToImageAsset(poster), video: { url: videoUrl.trim() } },
                  ]);
                }}
              >
                {busy ? "Adding…" : "Add video"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
