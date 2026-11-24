"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface RenamePlanItem {
  id: string;
  filename: string;
  from: string;
  to: string | null;
  source: string;
  usedBy: string[];
}

interface RenameResult {
  renamed: number;
  skipped: number;
  recordsUpdated: number;
}

const leaf = (path: string) => path.split("/").pop() ?? path;

/**
 * Renames files still stored under an id (`3f2a…-….jpg`) to readable,
 * search-friendly names. Shows exactly what will change first; applying it
 * updates every album, event and post that uses them, and the old addresses
 * redirect to the new ones.
 */
export function SeoFileNamesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const preview = useQuery({
    queryKey: ["media", "seo-names"],
    queryFn: () => api.get<RenamePlanItem[]>("/admin/media/seo-names/preview"),
    enabled: open,
  });

  const apply = useMutation({
    mutationFn: () => api.post<RenameResult>("/admin/media/seo-names/apply", {}),
    onSuccess: (result) => {
      toast.success(
        `${result.renamed} file${result.renamed === 1 ? "" : "s"} renamed; ${result.recordsUpdated} record${result.recordsUpdated === 1 ? "" : "s"} updated`,
      );
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = preview.data ?? [];
  const ready = items.filter((item) => item.to);
  const stuck = items.filter((item) => !item.to);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>Readable file names</DialogTitle>
          <DialogDescription>
            Files uploaded before now are stored under an id. Readable names help image search.
            Each file is named from its alt text, its original file name, or the title of the
            album, event or post that shows it. Every page that uses a file is updated, and old
            links redirect to the new names.
          </DialogDescription>
        </DialogHeader>

        {preview.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : preview.isError ? (
          <p className="text-sm text-destructive">
            {(preview.error as Error)?.message ?? "Could not load the preview."}
          </p>
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-success" /> Every file already has a readable
            name.
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {ready.length > 0 && (
              <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
                {ready.map((item) => (
                  <li key={item.id} className="space-y-1 p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 font-mono">
                      <span className="text-muted-foreground line-through">{leaf(item.from)}</span>
                      <ArrowRightIcon className="size-3 shrink-0" />
                      <span className="font-medium text-foreground">{leaf(item.to!)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                      <Badge variant="muted">from {item.source}</Badge>
                      {item.usedBy.length > 0 && <span>Used in: {item.usedBy.join(", ")}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {stuck.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Left as they are ({stuck.length}) — nothing readable to name them by. Add English
                  alt text in the library, then run this again.
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {stuck.map((item) => (
                    <li key={item.id}>
                      <Badge variant="outline" className="font-mono">
                        {item.filename || leaf(item.from)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={ready.length === 0 || apply.isPending}
            onClick={() => apply.mutate()}
          >
            {apply.isPending
              ? "Renaming…"
              : `Rename ${ready.length} file${ready.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
