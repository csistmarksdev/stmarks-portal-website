/**
 * Module resolution hook for running the project's `.ts` data files directly
 * under Node.
 *
 * Node 24 strips TypeScript types natively, but it does not do TypeScript's
 * *resolution*: `import { x } from "./media"` has no extension, and Node's ESM
 * resolver requires one. This hook fills that single gap.
 *
 * The `@/*` aliases need no handling — every one of them in `src/data` is an
 * `import type`, which is erased before resolution ever happens.
 *
 * Used by `migrate-to-portal.mjs`:
 *   node --import ./scripts/ts-resolve-hook.mjs scripts/migrate-to-portal.mjs
 */

import { existsSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js"];

export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(specifier);

  if (isRelative && !hasExtension && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    for (const extension of EXTENSIONS) {
      const candidate = new URL(base.href + extension);
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(candidate.href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}

// Self-register when loaded via `--import`, so the hook applies to the entry
// point's own dependency graph rather than only to dynamic imports.
register(pathToFileURL(import.meta.filename));
