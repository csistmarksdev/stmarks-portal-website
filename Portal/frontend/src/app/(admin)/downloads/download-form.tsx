"use client";

import type {
  DownloadCategory,
  DownloadFile,
  LocalizedText,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { DOWNLOAD_CATEGORIES } from "@portal/shared";
import { ArrowLeftIcon, FileIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LocalizedField } from "@/components/admin/localized-field";
import { MediaLibraryDialog } from "@/components/admin/media-picker";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceItem, useResourceMutations } from "@/hooks/use-resource";
import { fellowshipOptions } from "@/config/fields";
import { toDateInput } from "@/lib/utils";

interface FileRef {
  fileUrl: string;
  format: string;
  size: string;
}

export function DownloadForm({ id }: { id?: string }) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const { data, isLoading } = useResourceItem<WithStatus<DownloadFile>>(
    "/admin/downloads",
    id,
  );
  const { create, update } = useResourceMutations("/admin/downloads", "Download");

  const [title, setTitle] = useState<LocalizedText>({ en: "", ta: "" });
  const [description, setDescription] = useState<LocalizedText>({ en: "", ta: "" });
  const [category, setCategory] = useState<DownloadCategory>("bulletin");
  const [publishedAt, setPublishedAt] = useState("");
  const [fellowshipSlug, setFellowshipSlug] = useState("");
  const [status, setStatus] = useState<PublishStatus>("draft");
  const [file, setFile] = useState<FileRef | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description ?? { en: "", ta: "" });
    setCategory(data.category);
    setPublishedAt(toDateInput(data.publishedAt));
    setFellowshipSlug(data.fellowshipSlug ?? "");
    setStatus(data.status);
    setFile({ fileUrl: data.fileUrl, format: data.format, size: data.size });
  }, [data]);

  const busy = create.isPending || update.isPending;

  const submit = async () => {
    if (!title.en.trim()) return toast.error("Title (English) is required");
    if (!file) return toast.error("Pick a file from the media library");
    if (!publishedAt) return toast.error("Published date is required");

    const payload = {
      title,
      description: description.en || description.ta ? description : undefined,
      category,
      ...file,
      publishedAt: new Date(publishedAt).toISOString(),
      fellowshipSlug: fellowshipSlug || undefined,
      status,
    };

    if (isEdit && id) {
      await update.mutateAsync({ id, body: payload });
    } else {
      await create.mutateAsync(payload);
      router.push("/downloads");
    }
  };

  if (isEdit && isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? "Edit download" : "New download"}
        actions={
          <Button variant="outline" className="hidden lg:inline-flex" asChild>
            <Link href="/downloads">
              <ArrowLeftIcon /> Back
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="space-y-5 pt-5">
          <LocalizedField label="Title" value={title} onChange={setTitle} required />
          <LocalizedField
            label="Description"
            value={description}
            onChange={setDescription}
            multiline
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value as DownloadCategory)}
              >
                {DOWNLOAD_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Published on <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              File <span className="text-destructive">*</span>
            </Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-md border p-3">
                <FileIcon className="size-6 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate">{file.fileUrl}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.format} · {file.size}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                Choose file…
              </Button>
            )}
            <MediaLibraryDialog
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              kind="pdf"
              onSelect={(items) => {
                const item = items[0];
                if (item) {
                  setFile({ fileUrl: item.url, format: item.format, size: item.size });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Format and size are computed automatically at upload time.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fellowship</Label>
              <Select
                value={fellowshipSlug}
                onChange={(event) => setFellowshipSlug(event.target.value)}
              >
                <option value="">—</option>
                {fellowshipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as PublishStatus)}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t pt-4 sm:flex sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/downloads">Cancel</Link>
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => void submit()}
              disabled={busy}
            >
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create download"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
