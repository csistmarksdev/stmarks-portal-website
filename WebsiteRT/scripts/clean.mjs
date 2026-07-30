#!/usr/bin/env node
/**
 * Remove the build cache.
 *
 * `.next` was measured at 2.6 GB on this project after a dev-worker storm, and
 * a corrupt dev cache is the usual reason a fresh `next dev` immediately starts
 * crash-looping. Deleting it costs one slow first compile and nothing else —
 * everything in here is regenerated.
 *
 * `rm -rf` is not portable to PowerShell, hence a script rather than a
 * shell-string in package.json.
 */

import { rmSync, existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function directorySize(directory) {
  let total = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    try {
      if (entry.isDirectory()) total += directorySize(full);
      else total += statSync(full).size;
    } catch {
      /* Vanished mid-walk; it is being deleted anyway. */
    }
  }
  return total;
}

for (const name of [".next", ".turbo"]) {
  const target = path.join(projectRoot, name);
  if (!existsSync(target)) continue;

  let label = "";
  try {
    label = ` (${(directorySize(target) / 1024 ** 3).toFixed(2)} GB)`;
  } catch {
    /* Size is a nicety, not a requirement. */
  }

  rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  console.log(`[clean] removed ${name}${label}`);
}

console.log("[clean] done");
