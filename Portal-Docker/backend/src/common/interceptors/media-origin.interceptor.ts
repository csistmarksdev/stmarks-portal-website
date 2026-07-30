import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Rewrites stored media URLs to the origin the request actually arrived on.
 *
 * The problem this solves
 * ----------------------
 * Media URLs are absolute (`http://host/uploads/x.png`) and stored *inside*
 * content records, so the origin is fixed at the moment an admin uploads a
 * file. That is fine on one fixed server and wrong everywhere else: the same
 * image is reached as `http://localhost:8080/...` from the host, as
 * `http://10.0.0.5:8080/...` from a phone, and as `https://portal.example.org/...`
 * from the internet — and only one of those can be the stored value. The other
 * two render a page of broken images.
 *
 * `PUBLIC_URL` plus a boot-time repair (see `restore-snapshot.mjs`) gets one of
 * them right, which is enough for a single deployment but not for an image that
 * is supposed to run unchanged on ZimaOS, Render, Railway, Azure and a laptop.
 * On most of those you do not even know the hostname until after the first
 * deploy. Rewriting per response removes the question: whatever origin the
 * browser used to reach us is the origin it gets its images from, so the
 * container is correct on first boot with nothing configured.
 *
 * Scope
 * -----
 * Deliberately narrow. Only `<origin>/uploads/<path>` is touched, and only the
 * origin part of it. A link to YouTube, to a diocesan site, or to anything that
 * is not this API's upload route is left exactly as it is — which is what keeps
 * gallery videos and external references working.
 *
 * Set `MEDIA_ORIGIN_FROM_REQUEST=false` to disable, for a deployment that
 * serves media from a CDN on a genuinely different origin from the API.
 */
/** `http(s)://any-host/uploads/` — the part that has to change. */
const OWN_MEDIA = /https?:\/\/[^/"\s]+\/uploads\//g;

@Injectable()
export class MediaOriginInterceptor implements NestInterceptor {
  private readonly enabled = process.env.MEDIA_ORIGIN_FROM_REQUEST !== "false";

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled || context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const origin = requestOrigin(request);
    if (!origin) return next.handle();

    const base = `${origin}/uploads/`;
    return next.handle().pipe(map((body) => rewrite(body, base)));
  }
}

/**
 * The origin the client used, as best it can be known.
 *
 * `x-forwarded-*` is trusted because in every deployment this image is built
 * for, something is in front of it: the bundled router inside the container
 * always, and a platform's TLS terminator on top of that. Reading `host` alone
 * would report the internal port and `http`, so every media URL on Render would
 * come back as `http://…` and be blocked as mixed content on an HTTPS page.
 *
 * A forwarding header can be spoofed by a client — the cost here is that an
 * attacker makes *their own* response point at a host of their choosing, which
 * gains them nothing.
 */
function requestOrigin(request: Request): string | null {
  const first = (value: unknown): string | undefined =>
    (Array.isArray(value) ? value[0] : value)?.toString().split(",")[0]?.trim();

  const host = first(request.headers["x-forwarded-host"]) ?? first(request.headers.host);
  if (!host) return null;

  const proto =
    first(request.headers["x-forwarded-proto"]) ??
    (request.secure ? "https" : "http");

  return `${proto}://${host}`;
}

/**
 * Replace media origins throughout a response body.
 *
 * Only plain objects and arrays are walked. Anything else is returned as-is,
 * which matters more than it looks: a `Date` is `typeof "object"` with no
 * enumerable keys, so rebuilding it with `Object.fromEntries` yields `{}` —
 * every timestamp in every API response would be replaced by an empty object.
 */
function rewrite(value: unknown, base: string): unknown {
  if (typeof value === "string") {
    return value.includes("/uploads/") ? value.replace(OWN_MEDIA, base) : value;
  }
  if (Array.isArray(value)) return value.map((item) => rewrite(item, base));
  if (value !== null && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          rewrite(v, base),
        ]),
      );
    }
  }
  return value;
}
