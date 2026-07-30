"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { MobileNav } from "@/components/admin/mobile-nav";
import { Sidebar } from "@/components/admin/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
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
      {/* Sidebar floats at left-4 with width 15rem — content clears it plus a gutter. */}
      <div className="lg:pl-[17rem]">
        <main className="pb-dock px-4 py-6 lg:px-6 lg:py-8 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
