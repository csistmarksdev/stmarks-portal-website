"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

/**
 * What the installed app was opened *with*: a backup file, or a Portal link.
 *
 * The manifest's `launch_handler` is `focus-existing`: a Portal link clicked
 * in an email, a shortcut on the app icon, a `web+stmarks:` link, or a backup
 * file opened with "Open with → St. Mark's Portal" all bring the window that
 * is already open to the front rather than starting another. The browser then
 * hands the page what it was opened with through `window.launchQueue`, and it
 * is up to the page to go there. This module is that hand-over:
 *
 * - the consumer is set once, at start-up (`startAppLaunch`, from lib/pwa.ts);
 * - what it receives waits here until the admin layout is mounted with a
 *   signed-in user (`useAppLaunchNavigation`), so opening a backup while
 *   signed out still lands on the Backup page once the person has signed in;
 * - a backup file waits until the Backup page takes it (`usePendingBackupFile`)
 *   - it is uploaded for review exactly as if chosen there; nothing is
 *   restored without the confirming click.
 */

type LaunchParams = {
  targetURL?: string;
  files: ReadonlyArray<{ kind: string; getFile?: () => Promise<File> }>;
};
type LaunchQueue = { setConsumer(consumer: (params: LaunchParams) => void): void };

let pendingPath: string | null = null;
let pendingBackup: File | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

let started = false;

export function startAppLaunch(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  const queue = (window as Window & { launchQueue?: LaunchQueue }).launchQueue;
  queue?.setConsumer(async (params) => {
    const handle = params.files.find((file) => file.kind === "file" && file.getFile);
    if (handle?.getFile) {
      try {
        const file = await handle.getFile();
        if (file.name.toLowerCase().endsWith(".zip")) {
          pendingBackup = file;
          pendingPath = "/backup";
          emit();
          return;
        }
      } catch {
        // Permission refused or the file is gone: fall through to the link.
      }
    }

    if (params.targetURL) {
      const target = new URL(params.targetURL);
      if (target.origin === window.location.origin) {
        pendingPath = target.pathname + target.search;
        emit();
      }
    }
  });
}

/** In the admin layout: go wherever the app was last opened with. */
export function useAppLaunchNavigation(enabled: boolean): void {
  const router = useRouter();
  const pathname = usePathname();
  const path = useSyncExternalStore(subscribe, () => pendingPath, () => null);

  useEffect(() => {
    if (!enabled || !path) return;
    pendingPath = null;
    if (path !== pathname + window.location.search) router.push(path);
  }, [enabled, path, pathname, router]);
}

/** On the Backup page: the backup file the app was opened with, once. */
export function usePendingBackupFile(onFile: (file: File) => void): void {
  const file = useSyncExternalStore(subscribe, () => pendingBackup, () => null);

  useEffect(() => {
    if (!file) return;
    pendingBackup = null;
    emit();
    onFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);
}
