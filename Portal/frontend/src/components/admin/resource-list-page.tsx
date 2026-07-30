"use client";

import type { PublishStatus } from "@portal/shared";
import { PUBLISH_STATUSES } from "@portal/shared";
import {
  ArchiveIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ErrorState } from "@/components/admin/error-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounced } from "@/hooks/use-debounced";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useAuth } from "@/lib/auth";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface WithIdStatus {
  id: string;
  status: PublishStatus;
}

/**
 * Generic admin collection screen. Records render as a card grid — the first
 * column is the card's title, the rest become labelled meta rows — with the
 * publish workflow, edit and delete along the card's footer.
 */
export function ResourceListPage<T extends WithIdStatus>({
  title,
  description,
  eyebrow,
  apiPath,
  routeBase,
  label,
  columns,
  extraRowActions,
  canCreate = true,
  searchPlaceholder,
  emptyTitle,
  emptyHint,
}: {
  title: string;
  description?: string;
  /** Small-caps kicker above the title. */
  eyebrow?: string;
  /** e.g. "/admin/events" */
  apiPath: string;
  /** e.g. "/events" (admin frontend route base) */
  routeBase: string;
  label: string;
  columns: ColumnDef<T>[];
  extraRowActions?: (item: T) => ReactNode;
  canCreate?: boolean;
  searchPlaceholder?: string;
  /** First line of the empty state when the collection has no records at all. */
  emptyTitle?: string;
  /** Supporting line under `emptyTitle`. */
  emptyHint?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { can } = useAuth();

  // The box updates instantly; the query waits for typing to settle.
  const debouncedSearch = useDebounced(search);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useResourceList<T>(apiPath, {
      page,
      pageSize: 20,
      search: debouncedSearch || undefined,
      status: status || undefined,
    });
  const { remove, setStatus: mutateStatus } = useResourceMutations(apiPath, label);

  const filtering = Boolean(search || status);
  const [primary, ...meta] = columns;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        actions={
          canCreate && can("content.write") ? (
            // Hidden on phones — the floating action button below takes over,
            // since the top-right corner is the worst spot for a thumb.
            <Button className="hidden lg:inline-flex" asChild>
              <Link href={`${routeBase}/new`}>
                <PlusIcon /> New {label.toLowerCase()}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {canCreate && can("content.write") && (
        <Link
          href={`${routeBase}/new`}
          aria-label={`New ${label.toLowerCase()}`}
          className="bottom-dock fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground [box-shadow:var(--shadow-float)] transition-transform active:scale-95 lg:hidden"
        >
          <PlusIcon className="size-6" />
        </Link>
      )}

      <div className="mb-5 flex gap-2">
        <Input
          placeholder={searchPlaceholder ?? "Search…"}
          className="min-w-0 flex-1 sm:max-w-xs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          className="w-32 shrink-0 sm:w-40"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {PUBLISH_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        /* A failed request must never be dressed up as "nothing here" — that
           reads as data loss and invites someone to re-create records that
           already exist. */
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
          busy={isFetching}
        />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong py-16">
          {filtering ? (
            <div className="text-center text-sm text-muted-foreground">
              <p>Nothing matches that search.</p>
              <button
                type="button"
                className="mt-1 font-medium text-primary hover:underline"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPage(1);
                }}
              >
                Clear the filters
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-sm text-center">
              <p className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
                {emptyTitle ?? "Nothing here yet"}
              </p>
              {emptyHint && (
                <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>
              )}
              {canCreate && can("content.write") && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href={`${routeBase}/new`}>
                    <PlusIcon /> Create the first one
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data?.items.map((item) => (
              <Card
                key={item.id}
                /* The lift transition lives on Card itself (`.transition-card`,
                   box-shadow + transform only) — this previously used
                   `transition-all`, which animated the gradient and every
                   colour on all 20 cards and made hovering the grid stutter. */
                className="flex flex-col hover:-translate-y-1 hover:ring-border-strong hover:[box-shadow:var(--shadow-card-hover)]"
              >
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-[15px] leading-snug">
                      {can("content.write") ? (
                        <Link
                          href={`${routeBase}/${item.id}`}
                          className="transition-colors hover:text-primary"
                        >
                          {primary.render(item)}
                        </Link>
                      ) : (
                        primary.render(item)
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  {meta.length > 0 && (
                    <dl className="mt-4 space-y-1.5 text-[13px]">
                      {meta.map((column) => (
                        <div
                          key={column.key}
                          className="flex items-baseline justify-between gap-4"
                        >
                          <dt className="shrink-0 text-muted-foreground">
                            {column.header}
                          </dt>
                          <dd className="min-w-0 truncate text-right">
                            {column.render(item)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border/70 px-3 py-2">
                  {can("content.write") ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`${routeBase}/${item.id}`}>
                        <PencilIcon /> Edit
                      </Link>
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-0.5">
                    {extraRowActions?.(item)}
                    {can("content.publish") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Workflow">
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.status !== "published" && (
                            <DropdownMenuItem
                              onSelect={() =>
                                mutateStatus.mutate({ id: item.id, status: "published" })
                              }
                            >
                              <CheckCircle2Icon /> Publish
                            </DropdownMenuItem>
                          )}
                          {item.status !== "draft" && (
                            <DropdownMenuItem
                              onSelect={() =>
                                mutateStatus.mutate({ id: item.id, status: "draft" })
                              }
                            >
                              <CircleDashedIcon /> Move to draft
                            </DropdownMenuItem>
                          )}
                          {item.status !== "archived" && (
                            <DropdownMenuItem
                              onSelect={() =>
                                mutateStatus.mutate({ id: item.id, status: "archived" })
                              }
                            >
                              <ArchiveIcon /> Archive
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {can("content.delete") && (
                      <ConfirmDialog
                        title={`Delete this ${label.toLowerCase()}?`}
                        description="This permanently removes the record. This action cannot be undone."
                        onConfirm={() => remove.mutateAsync(item.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            title="Delete"
                          >
                            <Trash2Icon />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {data && data.total > data.pageSize && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.total} total — page {data.page} of{" "}
                {Math.ceil(data.total / data.pageSize)}
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
