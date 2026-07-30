# Service layer

All content reaches the UI through this folder. Components never import from
`src/data/*` and never hardcode content.

## Current state

Each service returns mock data from `src/data/*.mock.ts`, wrapped in
`mockResponse()` so every function is already `async` and returns a Promise.

## Connecting the NestJS backend

`src/services/http.ts` already contains a typed `apiGet<T>()` helper with
query params, cache tags and revalidation support.

To connect an endpoint:

1. Set `NEXT_PUBLIC_API_URL` in the environment.
2. Change the service body — nothing else:

```ts
// Before
export function getEvents(): Promise<ChurchEvent[]> {
  return mockResponse([...EVENTS].sort(descending));
}

// After
export function getEvents(): Promise<ChurchEvent[]> {
  return apiGet<ChurchEvent[]>("/events", { tags: ["events"] });
}
```

Call sites, types and components stay untouched.

## Content shape

Translatable content fields use `LocalizedText` (`{ en: string; ta: string }`)
rather than a single string, matching how the API will return records. Resolve
them in components with `localize(field, locale)` from `@/lib/localize`.

UI chrome — button labels, section headings, form errors — is **not** content.
It lives in `src/messages/{en,ta}.json` and is read with `useTranslations()`.
