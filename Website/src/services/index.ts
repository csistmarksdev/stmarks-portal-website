/**
 * Service layer barrel.
 *
 * Every component reads content through these functions — never by importing
 * from `src/data/*` directly. All of them are already async, so replacing the
 * mock bodies with `apiGet(...)` calls requires no change at any call site.
 */
export * from "./announcements.service";
export * from "./blog.service";
export * from "./church.service";
export * from "./contact.service";
export * from "./downloads.service";
export * from "./events.service";
export * from "./fellowships.service";
export * from "./gallery.service";
export * from "./leadership.service";
export { ApiError, apiGet } from "./http";
