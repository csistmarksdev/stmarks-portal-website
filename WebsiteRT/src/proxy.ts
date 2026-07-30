import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

/**
 * Next.js 16 renamed Middleware to Proxy. next-intl still ships its handler
 * as `createMiddleware`, so we adapt it to the `proxy` export the framework
 * now looks for. Behaviour is unchanged: locale negotiation and prefixing.
 */
export const proxy = createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, and anything with a file extension
  // (this keeps /frames/*.jpg out of the locale rewrite path).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
