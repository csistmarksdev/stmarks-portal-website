"use client";

import type {
  ContentRevision,
  DownloadCategory,
  DownloadFile,
  LocalizedText,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { DOWNLOAD_CATEGORIES, DOWNLOAD_CATEGORY_LABELS } from "@portal/shared";
import { FileIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LocalizedField } from "@/components/admin/localized-field";
import { MediaLibraryDialog } from "@/components/admin/media-picker";
import { PageHeader } from "@/components/admin/page-header";
import {
  ApprovalNotice,
  FormActions,
  FormFooterActions,
  saveLabelFor,
} from "@/components/admin/form-actions";
import { StatusSelect, useApprovalLock } from "@/components/admin/status-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceItem, useResourceMutations } from "@/hooks/use-resource";
import { fellowshipOptions } from "@/config/fields";
import { toDateInput, fileNameOf } from "@/lib/utils";

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
  // Approval rule: an editor cannot change a published or archived record.
  const { locked, holds, canPublish } = useApprovalLock(data?.status, isEdit);
  const revision = (data as { revision?: ContentRevision } | undefined)?.revision ?? null;
  const { create, update, rejectRevision } = useResourceMutations("/admin/downloads", "Download");

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
    // A change waiting for approval is what the form edits.
    const record = {
      ...data,
      ...((data as { revision?: ContentRevision }).revision?.changes ?? {}),
    } as typeof data;
    setTitle(record.title);
    setDescription(record.description ?? { en: "", ta: "" });
    setCategory(record.category);
    setPublishedAt(toDateInput(record.publishedAt));
    setFellowshipSlug(record.fellowshipSlug ?? "");
    setStatus(record.status);
    setFile({ fileUrl: record.fileUrl, format: record.format, size: record.size });
  }, [data]);

  const busy = create.isPending || update.isPending;

  /** Saves; `asStatus` overrides the chosen status (Approve publishes). */
  const submit = async (asStatus?: PublishStatus) => {
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
      status: asStatus ?? status,
    };

    if (isEdit && id) {
      await update.mutateAsync({ id, body: payload });
      if (asStatus) setStatus(asStatus);
    } else {
      await create.mutateAsync(payload);
      router.push("/downloads");
    }
  };

  if (isEdit && isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }


  const actionProps = {
    backHref: "/downloads",
    // Changes waiting on a live item are reviewed like a new submission.
    savedStatus: revision ? ("pending" as const) : (data?.status as PublishStatus | undefined),
    onSave: () => void submit(),
    onApprove: () => void submit("published"),
    // Rejecting a change discards it; rejecting a new item returns it to draft.
    onReject: () =>
      revision && id ? rejectRevision.mutateAsync(id).catch(() => undefined) : submit("draft"),
    saveLabel: saveLabelFor({
      isEdit,
      holds,
      hasRevision: !!revision,
      canPublish,
      createLabel: "Create download",
    }),
    busy: busy || rejectRevision.isPending,
    disabled: locked,
  };
  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow={isEdit ? "Editing" : "Creating"}
        title={isEdit ? "Edit download" : "New download"}
        actions={<FormActions {...actionProps} />}
      />
      {isEdit && data ? (
        <div className="mb-4 empty:hidden">
          <ApprovalNotice
            status={data.status}
            revision={revision}
            isEdit={isEdit}
          />
        </div>
      ) : null}
      {/* Writing in the main column, everything else in a details column
          beside it - the same layout as the other content forms. */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <Card>
          <CardContent className="space-y-6">
            <LocalizedField label="Title" value={title} onChange={setTitle} required />
            <LocalizedField
              label="Description"
              value={description}
              onChange={setDescription}
              multiline
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <Label>
                File <span className="text-destructive">*</span>
              </Label>
              {file ? (
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-4">
                  <FileIcon className="size-6 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium" title={file.fileUrl}>
                      {fileNameOf(file.fileUrl)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.format} · {file.size}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                    Change
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4 text-left transition-colors hover:border-ring hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <FileIcon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">Choose a file</span>
                    <span className="block text-xs text-muted-foreground">
                      A PDF from the media library, or upload a new one
                    </span>
                  </span>
                </button>
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
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
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
                      {DOWNLOAD_CATEGORY_LABELS[value]}
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
              <div className="space-y-1.5">
                <Label>Fellowship</Label>
                <Select
                  value={fellowshipSlug}
                  onChange={(event) => setFellowshipSlug(event.target.value)}
                >
                  <option value="">None</option>
                  {fellowshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <StatusSelect value={status} onChange={setStatus} isNew={!isEdit} />
              </div>
            </div>
              <FormFooterActions {...actionProps} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
