"use client";

import type {
  BackupPreview,
  BackupTicket,
  RestoreMode,
  RestoreResult,
  StagedRestore,
} from "@portal/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  CheckCircle2Icon,
  DownloadIcon,
  RotateCcwIcon,
  UploadIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, apiUrl, uploadWithProgress } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unit = "B";
  for (const next of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

/** The word an admin has to type before a replace restore will run. */
const CONFIRM_PHRASE = "RESTORE";

export default function BackupPage() {
  const { can } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Safekeeping"
        title="Backup & restore"
        description="A backup is one zip file holding everything: all content, the media library, admin accounts and the activity history. Keep a copy somewhere that is not this server."
      />

      {can("backup.read") ? (
        <BackupCard />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Not available to your role</CardTitle>
            <CardDescription>
              A backup contains every record in the Portal, including admin
              accounts and their passwords. Only a super-admin can download or
              restore one.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Restoring is super-admin only, so for everyone else the card is
          absent rather than present and failing on click. */}
      {can("backup.restore") && <RestoreCard />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Backup                                                                     */
/* -------------------------------------------------------------------------- */

function BackupCard() {
  const [building, setBuilding] = useState(false);
  const [ticket, setTicket] = useState<BackupTicket | null>(null);

  const { data: preview, isLoading } = useQuery({
    queryKey: ["backup-preview"],
    queryFn: () => api.get<BackupPreview>("/admin/backup/preview"),
  });

  async function build() {
    setBuilding(true);
    try {
      const created = await api.post<BackupTicket>("/admin/backup");
      setTicket(created);
      /*
       * Start the download without a second click. The link is left on screen
       * regardless: a browser that blocks the programmatic navigation, or an
       * admin who wants the file twice, should not have to rebuild the archive.
       */
      window.location.href = `${apiUrl()}${created.downloadPath}`;
      toast.success(`Backup ready — ${created.size}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the backup");
    } finally {
      setBuilding(false);
    }
  }

  const collections = Object.entries(preview?.collections ?? {}).filter(
    ([, count]) => count > 0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArchiveIcon className="size-4 text-muted-foreground" />
          Download a backup
        </CardTitle>
        <CardDescription>
          Everything in the Portal, as it is right now, in a single zip file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : preview ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Figure value={preview.documents.toLocaleString("en-IN")} label="records" />
              <Figure value={preview.uploads.files.toLocaleString("en-IN")} label="media files" />
              <Figure value={preview.estimatedSize} label="approximate size" />
            </div>
            <div className="flex flex-wrap gap-1">
              {collections.map(([name, count]) => (
                <Badge key={name} variant="muted">
                  {name} {count}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-[13px] text-muted-foreground">
          The file includes admin accounts and their passwords, and every
          message from the contact form. Treat it like the database it is —
          store it somewhere private.
        </p>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {ticket && (
            <a
              href={`${apiUrl()}${ticket.downloadPath}`}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Download again ({ticket.size})
            </a>
          )}
          <Button onClick={build} disabled={building}>
            <DownloadIcon className="size-4" />
            {building ? "Building…" : "Build & download backup"}
          </Button>
        </div>

        {ticket && (
          <p className="text-right text-[13px] text-muted-foreground">
            Link expires {formatDateTime(ticket.expiresAt)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2.5">
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Restore                                                                    */
/* -------------------------------------------------------------------------- */

function RestoreCard() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [staged, setStaged] = useState<StagedRestore | null>(null);
  const [mode, setMode] = useState<RestoreMode>("replace");
  const [safetyBackup, setSafetyBackup] = useState(true);
  const [result, setResult] = useState<RestoreResult | null>(null);

  async function upload(file: File) {
    setStaged(null);
    setResult(null);
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      setStaged(
        await uploadWithProgress<StagedRestore>("/admin/backup/restore", form, setProgress),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that archive");
    } finally {
      setProgress(null);
      // Clear the input so choosing the same file again still fires `change`.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function apply() {
    if (!staged) return;
    try {
      const applied = await api.post<RestoreResult>(`/admin/backup/restore/${staged.id}`, {
        mode,
        safetyBackup,
      });
      setResult(applied);
      setStaged(null);
      /*
       * Every count on the page — and on every other page in the CMS — is now
       * describing a database that no longer exists. Clearing the whole cache
       * rather than naming queries is the honest response to a restore: there
       * is no part of the app whose data this did not change.
       */
      await queryClient.invalidateQueries();
      toast.success(`Restored ${applied.documents.toLocaleString("en-IN")} record(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The restore failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcwIcon className="size-4 text-muted-foreground" />
          Restore from a backup
        </CardTitle>
        <CardDescription>
          Upload a backup file to put the Portal back the way it was. You will
          see what is in the file before anything is changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <input
          ref={fileInput}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />

        {progress !== null ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-[13px] text-muted-foreground">
              {progress < 1
                ? `Uploading… ${Math.round(progress * 100)}%`
                : "Reading the archive…"}
            </p>
          </div>
        ) : !staged && !result ? (
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <UploadIcon className="size-4" />
            Choose a backup file
          </Button>
        ) : null}

        {staged && (
          <StagedReview
            staged={staged}
            mode={mode}
            onModeChange={setMode}
            safetyBackup={safetyBackup}
            onSafetyBackupChange={setSafetyBackup}
            onApply={apply}
            onCancel={() => setStaged(null)}
          />
        )}

        {result && <RestoreSummary result={result} onDone={() => setResult(null)} />}
      </CardContent>
    </Card>
  );
}

function StagedReview({
  staged,
  mode,
  onModeChange,
  safetyBackup,
  onSafetyBackupChange,
  onApply,
  onCancel,
}: {
  staged: StagedRestore;
  mode: RestoreMode;
  onModeChange: (mode: RestoreMode) => void;
  safetyBackup: boolean;
  onSafetyBackupChange: (on: boolean) => void;
  onApply: () => Promise<void>;
  onCancel: () => void;
}) {
  const { manifest } = staged;
  const collections = Object.entries(manifest.collections).filter(([, count]) => count > 0);

  return (
    <div className="space-y-5 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          Backup taken {formatDateTime(manifest.capturedAt)}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {manifest.documents.toLocaleString("en-IN")} records ·{" "}
          {manifest.uploads.files.toLocaleString("en-IN")} media files ·{" "}
          {humanBytes(staged.uploadBytes)}
          {manifest.createdBy ? ` · by ${manifest.createdBy.name}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {collections.map(([name, count]) => (
          <Badge key={name} variant="muted">
            {name} {count}
          </Badge>
        ))}
      </div>

      {staged.warnings.length > 0 && (
        <ul className="space-y-1.5">
          {staged.warnings.map((warning) => (
            <li key={warning} className="flex gap-2 text-[13px] text-accent-fg">
              <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">
          What should happen to the data that is here now?
        </legend>
        <ModeOption
          checked={mode === "replace"}
          onSelect={() => onModeChange("replace")}
          title="Replace"
          description="Clear everything the backup covers and put the backup in its place. Anything added since the backup was taken is lost — this is the option that truly puts things back."
        />
        <ModeOption
          checked={mode === "merge"}
          onSelect={() => onModeChange("merge")}
          title="Merge"
          description="Add what is missing and update what has changed, but delete nothing. Safer, but records deleted since the backup stay deleted."
        />
      </fieldset>

      {staged.untouchedCollections.length > 0 && (
        <p className="text-[13px] text-muted-foreground">
          Not in this backup, and left alone either way:{" "}
          {staged.untouchedCollections.join(", ")}.
        </p>
      )}

      <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 px-3 py-2.5">
        <div>
          <Label htmlFor="safety-backup" className="text-sm">
            Back up the current data first
          </Label>
          <p className="text-[13px] text-muted-foreground">
            Gives you a download link to undo this, in case the wrong file was
            uploaded.
          </p>
        </div>
        <Switch
          id="safety-backup"
          checked={safetyBackup}
          onCheckedChange={onSafetyBackupChange}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant={mode === "replace" ? "destructive" : "default"}>
              Restore this backup
            </Button>
          }
          title={mode === "replace" ? "Replace everything?" : "Merge this backup in?"}
          description={
            mode === "replace"
              ? `This clears every collection in the backup and puts back the data as it stood on ${formatDateTime(
                  manifest.capturedAt,
                )}. Anything created or edited since then is permanently lost, and admin passwords revert to what they were. It cannot be undone from inside the Portal.`
              : `This adds and updates records from the backup taken ${formatDateTime(
                  manifest.capturedAt,
                )}. Nothing is deleted, but existing records with the same id are overwritten.`
          }
          confirmLabel={mode === "replace" ? "Replace everything" : "Merge"}
          // Only the destructive mode asks for the word. Merge is recoverable
          // by restoring again; replace is not.
          confirmPhrase={mode === "replace" ? CONFIRM_PHRASE : undefined}
          onConfirm={onApply}
        />
      </div>
    </div>
  );
}

function ModeOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
        checked ? "border-ring bg-muted/60" : "border-border hover:bg-muted/40"
      }`}
    >
      <input
        type="radio"
        name="restore-mode"
        checked={checked}
        onChange={onSelect}
        className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function RestoreSummary({
  result,
  onDone,
}: {
  result: RestoreResult;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckCircle2Icon className="size-4 text-success" />
        Restored {result.documents.toLocaleString("en-IN")} records across{" "}
        {result.collections.length} collections, and {result.uploads.written} media
        file{result.uploads.written === 1 ? "" : "s"}.
      </p>

      <div className="flex flex-wrap gap-1">
        {result.collections.map((entry) => (
          <Badge key={entry.name} variant="muted">
            {entry.name} +{entry.inserted}
            {entry.updated > 0 ? ` ~${entry.updated}` : ""}
            {entry.removed > 0 ? ` −${entry.removed}` : ""}
          </Badge>
        ))}
      </div>

      {result.safetyBackup && (
        <p className="text-[13px]">
          <a
            href={`${apiUrl()}${result.safetyBackup.downloadPath}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Download the backup taken just before this restore
          </a>{" "}
          <span className="text-muted-foreground">
            ({result.safetyBackup.size}, link expires{" "}
            {formatDateTime(result.safetyBackup.expiresAt)}) — save it now if
            this was a mistake.
          </span>
        </p>
      )}

      {result.usersReplaced && (
        <p className="flex gap-2 text-[13px] text-accent-fg">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Admin accounts were restored too. If your password has changed since
            this backup was taken, sign in with the old one.
          </span>
        </p>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
