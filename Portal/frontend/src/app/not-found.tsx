import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="text-center">
        <p className="label text-accent-fg">Page not found</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          This page isn&apos;t in the portal
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          The link may be stale, or the record it pointed to has been removed.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary-hover hover:shadow-md"
        >
          <ArrowLeftIcon className="size-4" /> Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
