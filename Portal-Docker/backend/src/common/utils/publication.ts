import { BadRequestException } from "@nestjs/common";
import type { FilterQuery } from "mongoose";

/**
 * Public visibility (F-049) shared by the scheduled
 * content types (announcements, events, blog posts, gallery albums).
 */

/* -------------------------------------------------------------------------- */
/* F-049 - what the public API may see                                        */
/* -------------------------------------------------------------------------- */

/**
 * Filter for records the public website may see right now:
 * `status: "published"`, `publishAt` unset or past, and - when `expiry` is
 * set - `expiresAt` unset or still ahead.
 *
 * `{ field: null }` matches both a stored null and a missing key, so records
 * written before scheduling existed stay visible exactly as before.
 *
 * Returned under `$and` so it composes with callers' own `$or` clauses
 * (upcoming/past events, shared gallery albums) without overwriting them.
 */
export function publiclyVisible<T>(
  options: { expiry?: boolean; now?: Date } = {},
): FilterQuery<T> {
  const now = options.now ?? new Date();
  const clauses: FilterQuery<T>[] = [
    { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] } as FilterQuery<T>,
  ];
  if (options.expiry) {
    clauses.push({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    } as FilterQuery<T>);
  }
  return { status: "published", $and: clauses } as FilterQuery<T>;
}

/**
 * Converts an optional ISO string from a DTO into what the repository stores:
 * `undefined` leaves the field alone, `null`/"" removes it (see
 * `withRemovals` in the base repository), anything else becomes a Date.
 */
export function scheduleValue(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return new Date(value);
}

/** Rejects an expiry that is not after the scheduled publish time. */
export function assertScheduleOrder(
  publishAt: Date | null | undefined,
  expiresAt: Date | null | undefined,
): void {
  if (publishAt && expiresAt && expiresAt.getTime() <= publishAt.getTime()) {
    throw new BadRequestException(
      "expiresAt must be later than publishAt, or the record would never be public.",
    );
  }
}
