"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
            {children}
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" className="w-full sm:hidden" asChild>
                <Link href="/church">Back to church content</Link>
              </Button>
              <Button className="w-full sm:w-auto" onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
