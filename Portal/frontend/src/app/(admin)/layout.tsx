"use client";

import { ConstructionIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { MobileNav } from "@/components/admin/mobile-nav";
import { Sidebar } from "@/components/admin/sidebar";
import { isPathAllowed } from "@/config/navigation";
import { useAppLaunchNavigation } from "@/lib/app-launch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useMaintenance } from "@/lib/maintenance";
import { useSidebarCollapsed } from "@/lib/sidebar-state";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [sidebarCollapsed] = useSidebarCollapsed();
  const router = useRouter();
  const pathname = usePathname();
  // A page the user's role does not open bounces them home.
  const forbidden = !!user && !isPathAllowed(pathname, user.permissions);

  // A link, shortcut or backup file the installed app was opened with.
  useAppLaunchNavigation(!!user && !loading);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (forbidden) router.replace("/dashboard");
  }, [loading, user, forbidden, router]);

  if (loading || !user || forbidden) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="w-full max-w-md space-y-3 p-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Floating rail from lg up; app bar + tab bar below it. */}
      <Sidebar />
      <MobileNav />
      {/* Sidebar floats at left-4 with width 15rem - content clears it plus a gutter. */}
      {/* Clears the floating rail (left-4 plus its width) and a gutter. */}
      <div
        className={cn(
          "transition-[padding] duration-300 ease-[var(--ease-out-expo)]",
          sidebarCollapsed ? "lg:pl-[6.5rem]" : "lg:pl-[17rem]",
        )}
      >
        {/*
          On a phone there is no app bar above the page, so the page itself
          clears the status bar (and the notch, in the installed app).
        */}
        <main className="pb-dock px-4 py-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] lg:px-6 lg:py-8 lg:pb-8">
          {/*
            Every page shares one centred column. Pages stop at max-w-6xl; left
            aligned, any width beyond that - a wide screen, or the room freed by
            collapsing the sidebar - all piled up on the right.
          */}
          <div className="mx-auto w-full max-w-6xl">
            <MaintenanceBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Shown on every Portal page while maintenance mode is on, so nobody forgets
 * the public website is behind its notice. The super admin gets a link to
 * switch it off.
 */
function MaintenanceBanner() {
  const { data } = useMaintenance();
  const { can } = useAuth();
  if (!data?.enabled) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-accent-fg/10 px-4 py-2.5 text-sm text-accent-fg ring-1 ring-accent-fg/20">
      <ConstructionIcon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">
        <span className="font-medium">Maintenance mode is on.</span> The public website is set to
        show its maintenance notice to visitors.
      </span>
      {can("site.maintenance") && (
        <Link href="/maintenance" className="font-medium underline underline-offset-2">
          Manage
        </Link>
      )}
    </div>
  );
}
