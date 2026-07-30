import type { Paginated } from "@portal/shared";

import type { PaginationQueryDto } from "../dto/pagination-query.dto";

export const DEFAULT_PAGE_SIZE = 12;

/**
 * Contract behavior for list endpoints (§5 of the Website spec):
 * - no `page`/`pageSize` → plain array (optionally capped by `limit`)
 * - `page` or `pageSize` present → `Paginated<T>` envelope
 */
export async function resolveList<T>(
  query: PaginationQueryDto,
  find: (skip?: number, limit?: number) => Promise<T[]>,
  count: () => Promise<number>,
): Promise<T[] | Paginated<T>> {
  if (query.page !== undefined || query.pageSize !== undefined) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const [items, total] = await Promise.all([
      find((page - 1) * pageSize, pageSize),
      count(),
    ]);
    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }
  const items = await find(0, query.limit);
  return items;
}
