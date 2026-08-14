"use client";

import type { LoginResponse } from "@portal/shared";

/**
 * Where the API lives.
 *
 * `NEXT_PUBLIC_API_URL` is baked in at build time, so hardcoding it to
 * localhost breaks the moment the CMS is opened from another device — the
 * phone would call *its own* localhost. When the variable is unset we derive
 * the API origin from whatever host the page was loaded from, so the same
 * build works on localhost, a LAN address or a VPN address with no rebuild.
 *
 * Set `NEXT_PUBLIC_API_URL` explicitly when the API lives on a different host
 * from the CMS (a separate domain in production, say).
 */
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "4000";
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? "v1";

/**
 * Whether the API answers on the page's own origin, with no port of its own.
 *
 * Set at build time by the container image, where one router serves the CMS and
 * proxies `/v1` to the API behind it. Without this the CMS would take the page
 * origin and bolt `:4000` onto it — so a portal opened at
 * `https://portal.example.org` would call `https://portal.example.org:4000/v1`,
 * a port no hosting platform exposes and TLS does not answer on. Every request
 * fails, including the login that would otherwise reveal the problem.
 *
 * Deriving it instead of hardcoding keeps the plain two-port deployment (`npm
 * run dev`, `SPLIT_PORTS=true`) working unchanged.
 */
const SAME_ORIGIN = process.env.NEXT_PUBLIC_API_SAME_ORIGIN === "true";

function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { protocol, hostname, origin } = window.location;
    // `origin` keeps whatever port the page was served on — including none,
    // which is the whole point behind a platform's HTTPS front door.
    return SAME_ORIGIN
      ? `${origin}/${API_PREFIX}`
      : `${protocol}//${hostname}:${API_PORT}/${API_PREFIX}`;
  }

  // Server-side render / prerender: nothing calls the API here, but keep a
  // sane value so URL construction never throws.
  return SAME_ORIGIN
    ? `/${API_PREFIX}`
    : `http://localhost:${API_PORT}/${API_PREFIX}`;
}

/**
 * Resolved lazily and cached — `window` is unavailable while this module is
 * first evaluated during prerendering.
 */
let cachedApiUrl: string | null = null;

export function apiUrl(): string {
  if (cachedApiUrl === null) cachedApiUrl = resolveApiUrl();
  return cachedApiUrl;
}

const ACCESS_KEY = "portal.accessToken";
const REFRESH_KEY = "portal.refreshToken";

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

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

/** Single-flight refresh so parallel 401s don't race each other. */
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = tokenStore.refresh;
      if (!refreshToken) return false;
      try {
        const response = await fetch(`${apiUrl()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;
        const data = (await response.json()) as LoginResponse;
        tokenStore.set(data);
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  formData?: FormData;
}

/**
 * The only endpoints a 401 must *not* trigger a refresh for.
 *
 * `/auth/refresh` would recurse; `/auth/login` and `/auth/logout` have no
 * session to rescue. Everything else under `/auth` — `/auth/me` above all — is
 * an ordinary authenticated read and has to be retried like any other request.
 *
 * This used to exclude the whole `/auth/` prefix, which quietly capped every
 * session at the 15-minute access-token lifetime: `/auth/me` is what the app
 * calls on load, so after a short idle the reload 401'd, skipped the refresh,
 * and bounced a perfectly valid seven-day session to the login screen.
 */
const NO_REFRESH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/logout"];

async function request<T>(endpoint: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const url = new URL(`${apiUrl()}${endpoint}`);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  const access = tokenStore.access;
  if (access) headers.Authorization = `Bearer ${access}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });

  const refreshable = !NO_REFRESH_ENDPOINTS.some((path) => endpoint.startsWith(path));

  if (response.status === 401 && !retried && refreshable) {
    if (await tryRefresh()) {
      return request<T>(endpoint, options, true);
    }
    tokenStore.clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
      }
    } catch {
      // Non-JSON error body.
    }
    throw new ApiError(message, response.status, endpoint);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * A multipart POST that reports how much has gone up.
 *
 * `fetch` cannot do this — there is no upload-progress event on it — so this
 * one call drops to `XMLHttpRequest`. Justified by what it carries: a restore
 * archive is the whole media library, potentially gigabytes over a church
 * office's connection, and a bare spinner for four minutes is indistinguishable
 * from a hang.
 */
export function uploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress: (fraction: number) => void,
  retried = false,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl()}${endpoint}`);

    const access = tokenStore.access;
    if (access) request.setRequestHeader("Authorization", `Bearer ${access}`);

    request.upload.addEventListener("progress", (event) => {
      // `lengthComputable` is false for a chunked body; leaving the caller on
      // its last known value beats reporting a made-up one.
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });

    request.addEventListener("error", () =>
      reject(new ApiError("The upload failed — check the connection", 0, endpoint)),
    );
    request.addEventListener("abort", () =>
      reject(new ApiError("The upload was cancelled", 0, endpoint)),
    );

    request.addEventListener("load", () => {
      if (request.status === 401 && !retried) {
        void tryRefresh().then((refreshed) => {
          if (refreshed) {
            resolve(uploadWithProgress<T>(endpoint, formData, onProgress, true));
            return;
          }
          tokenStore.clear();
          reject(new ApiError("Your session has expired", 401, endpoint));
        });
        return;
      }

      let body: unknown;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        body = undefined;
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(body as T);
        return;
      }

      const message = (body as { message?: string | string[] } | undefined)?.message;
      reject(
        new ApiError(
          Array.isArray(message)
            ? message.join("; ")
            : (message ?? `Request failed with ${request.status}`),
          request.status,
          endpoint,
        ),
      );
    });

    request.send(formData);
  });
}

export const api = {
  get: <T>(endpoint: string, params?: RequestOptions["params"]) =>
    request<T>(endpoint, { params }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body }),
  delete: <T = void>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: "POST", formData }),
};
