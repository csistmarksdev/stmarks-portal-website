import { API_BASE_URL } from "@/constants/site";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  /** Query string parameters; `undefined` values are dropped. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Seconds before the cached response is considered stale. */
  revalidate?: number;
  /** Cache tags, for targeted revalidation once the CMS publishes changes. */
  tags?: string[];
  signal?: AbortSignal;
}

function buildUrl(
  endpoint: string,
  params?: RequestOptions["params"],
): string {
  const url = new URL(
    endpoint.replace(/^\//, ""),
    API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`,
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Thin typed wrapper around `fetch` for the NestJS API.
 *
 * `fallback` keeps the documented behaviour from `README.md`: with
 * `NEXT_PUBLIC_API_URL` unset the site still renders, from `src/data/*.mock.ts`.
 * That is only a *configuration* fallback — once the variable is set, a failing
 * request throws rather than quietly serving stale fiction, because a page that
 * silently shows last year's events is worse than one that errors.
 */
export async function apiGet<T>(
  endpoint: string,
  options: RequestOptions & { fallback?: () => T | Promise<T> } = {},
): Promise<T> {
  const { params, revalidate = 300, tags, signal, fallback } = options;

  if (!API_BASE_URL) {
    if (fallback) return fallback();
    throw new ApiError("NEXT_PUBLIC_API_URL is not configured.", 500, endpoint);
  }

  const response = await fetch(buildUrl(endpoint, params), {
    headers: { Accept: "application/json" },
    next: { revalidate, tags },
    signal,
  });

  if (!response.ok) {
    throw new ApiError(
      `Request to ${endpoint} failed with ${response.status}`,
      response.status,
      endpoint,
    );
  }

  return (await response.json()) as T;
}

/**
 * `apiGet` for the by-slug endpoints, which 404 when a record is missing or
 * unpublished. The services they back are typed `Promise<T | null>` — the
 * Website treats "no such album" as an empty state, not an error — so the 404
 * is translated here rather than in eight separate catch blocks.
 *
 * Only 404 is swallowed. A 500 still throws.
 */
export async function apiGetOrNull<T>(
  endpoint: string,
  options: RequestOptions & { fallback?: () => T | null | Promise<T | null> } = {},
): Promise<T | null> {
  try {
    // `T | null` so the caller's nullable fallback satisfies `apiGet`.
    return await apiGet<T | null>(endpoint, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * POST helper — currently just the contact form.
 *
 * Unlike the GETs there is no mock fallback: silently pretending a message was
 * delivered when no backend is configured would be a lie to a real visitor.
 */
export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  options: Pick<RequestOptions, "signal"> = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not configured.", 500, endpoint);
  }

  const response = await fetch(buildUrl(endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ApiError(
      `Request to ${endpoint} failed with ${response.status}`,
      response.status,
      endpoint,
    );
  }

  return (await response.json()) as T;
}

/**
 * Resolve mock data through the same async boundary the real API will use.
 * Keeping services `async` today means call sites never change later.
 */
export async function mockResponse<T>(data: T): Promise<T> {
  return data;
}
