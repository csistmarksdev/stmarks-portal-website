import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware replacements for `next/link` and `next/navigation`.
 * Always import navigation primitives from here so locale prefixes
 * are handled automatically.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
