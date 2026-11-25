/**
 * Where a `web+stmarks:` link lands (the manifest's `protocol_handlers`).
 *
 * Once the Portal is installed, a link such as `web+stmarks:events/123` -
 * in an email, a chat, a note - opens that screen in the Portal's own window.
 * The browser hands the whole link over as `?to=web+stmarks:events/123`.
 *
 * Only ever a path inside the Portal: the scheme and any leading slashes are
 * dropped, and anything that is not plain path characters sends the reader to
 * the dashboard, so the link can never redirect off-site.
 */
const SAFE_PATH = /^[A-Za-z0-9\-_/]{1,200}$/;

export function GET(request: Request): Response {
  const to = new URL(request.url).searchParams.get("to") ?? "";
  const path = to
    .replace(/^web\+stmarks:/i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  const target = SAFE_PATH.test(path) && !path.includes("//") ? `/${path}` : "/dashboard";
  // Relative, so it holds behind the container's router whatever host Next sees.
  return new Response(null, { status: 307, headers: { Location: target } });
}
