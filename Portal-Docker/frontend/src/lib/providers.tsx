"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { AuthProvider } from "./auth";
import { startPwa } from "./pwa";
import { ThemeProvider, useTheme } from "./theme";

/** Toasts have their own surface, so they need telling which theme is active. */
function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" theme={theme} />;
}

export function Providers({ children }: { children: ReactNode }) {
  // The service worker and the install offer - see lib/pwa.ts.
  useEffect(() => startPwa(), []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <ThemedToaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
