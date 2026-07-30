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
 * Thin typed wrapper around `fetch` for the future NestJS API.
 *
 * Nothing calls this yet — every service currently resolves from
 * `src/data/*.mock.ts`. It exists so that swapping a service body from
 * `mockResponse(...)` to `apiGet<T>("/events")` is the only change needed
 * when the backend lands. See `src/services/README.md`.
 */
export async function apiGet<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "NEXT_PUBLIC_API_URL is not configured.",
      500,
      endpoint,
    );
  }

  const { params, revalidate = 300, tags, signal } = options;

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
 * Resolve mock data through the same async boundary the real API will use.
 * Keeping services `async` today means call sites never change later.
 */
export async function mockResponse<T>(data: T): Promise<T> {
  return data;
}
