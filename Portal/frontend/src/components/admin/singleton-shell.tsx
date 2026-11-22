"use client";

import { ArrowLeftIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

/** Shared chrome for the church singleton editors. */
export function SingletonShell({
  title,
  description,
  loading,
  saving,
  onSave,
  children,
}: {
  title: string;
  description?: string;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  /*
   * These documents have no draft state - a save is live at once - so under the
   * approval rule only an admin or super admin can save them (the API refuses
   * anyone else). Editors can still read them here.
   */
  const { can } = useAuth();
  const canSave = can("content.publish");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" className="hidden lg:inline-flex" asChild>
            <Link href="/church">
              <ArrowLeftIcon /> Church content
            </Link>
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardContent className="space-y-5 pt-5">
            {canSave ? null : (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  Changes here go straight to the website, so only an admin or
                  super admin can save them. Ask one to make the change.
                </p>
              </div>
            )}
            {children}
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" className="w-full sm:hidden" asChild>
                <Link href="/church">Back to church content</Link>
              </Button>
              <Button className="w-full sm:w-auto" onClick={onSave} disabled={saving || !canSave}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
