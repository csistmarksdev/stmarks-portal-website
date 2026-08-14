import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import helmet from "helmet";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { MediaOriginInterceptor } from "./common/interceptors/media-origin.interceptor";
import { corsOriginChecker } from "./common/utils/cors";

/**
 * Everything that turns a bare Nest app into *this* API: route prefix,
 * security headers, CORS, validation and the error envelope.
 *
 * Lives apart from `main.ts` so the smoke test boots an application configured
 * exactly like the real one. When this was inline in `bootstrap()`, the test
 * silently exercised an app with no CORS and no exception filter.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix(config.get<string>("apiPrefix", "v1"));

  /*
   * Decides what `req.ip` resolves to — see `trustProxy` in `configuration.ts`
   * for why the default differs between the two deployments. Set before the
   * throttler guard sees a request, because that guard keys its buckets on it.
   */
  app
    .getHttpAdapter()
    .getInstance()
    .set("trust proxy", config.get("trustProxy", false));

  app.use(
    helmet({
      // Media is loaded cross-origin by the CMS and the Website.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  /*
   * Gzip JSON responses. List endpoints return highly repetitive documents
   * (the same keys on every record, both languages on every field), which
   * compress by roughly an order of magnitude — the single biggest win for
   * the CMS over a slow connection. Already-compressed uploads are skipped by
   * the default filter.
   */
  app.use(compression());

  // Let Nest close Mongo connections and finish in-flight work on SIGTERM
  // rather than dying mid-request when the container is replaced.
  app.enableShutdownHooks();

  /*
   * Two different CORS postures, because they are genuinely different jobs.
   *
   * `CORS_ORIGINS=*` — the default for the container, and what the public
   * Website needs. The response carries a literal `Access-Control-Allow-Origin:
   * *`, which is cacheable by proxies and CDNs and identical for every caller.
   *
   * Reflecting the caller's own origin instead, as the checker below does, is
   * *also* "allow everything" — but it looks restrictive, and it is materially
   * worse in front of a CDN: the header varies per requester, so a cached copy
   * carries some earlier visitor's origin and the next visitor's browser
   * rejects it. `Vary: Origin` fixes the correctness and destroys the cache hit
   * rate. A wildcard has neither problem.
   *
   * Credentials must be off for the wildcard — the CORS specification forbids
   * `*` together with `Access-Control-Allow-Credentials: true`, and a browser
   * rejects the pair outright. That costs nothing here: this API has no cookie
   * authentication and no session. The CMS reads its token from `localStorage`
   * and sends it as an explicit `Authorization: Bearer` header, which is
   * unaffected by the credentials flag and works fine against a wildcard.
   *
   * A specific list keeps the old behaviour — reflection with credentials — so
   * that narrowing `CORS_ORIGINS` later remains a safe, meaningful tightening
   * rather than a silent no-op.
   */
  const corsOrigins = config.get<string[]>("corsOrigins", []);
  const allowAnyOrigin = corsOrigins.includes("*");

  app.enableCors(
    allowAnyOrigin
      ? {
          origin: "*",
          credentials: false,
          // Named explicitly rather than left to be reflected from
          // `Access-Control-Request-Headers`: a reflected value varies per
          // request, which reintroduces exactly the caching problem the
          // wildcard origin was chosen to avoid.
          allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
          methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
          exposedHeaders: ["Content-Length", "Content-Type", "ETag"],
          maxAge: 86_400,
        }
      : {
          origin: corsOriginChecker({
            allowed: corsOrigins,
            allowPrivateNetwork: config.get<boolean>("corsAllowPrivateNetwork", true),
          }),
          credentials: true,
        },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /*
   * Media URLs follow the origin each request arrived on.
   *
   * Without this every response hands out `${PUBLIC_URL}/uploads/…`, and
   * `PUBLIC_URL` is whatever could be worked out at boot — inside the container
   * with nothing configured, `http://localhost:8080`. That is correct for
   * exactly one viewer: someone sitting at the machine running Docker. Reached
   * from anywhere else — a ZimaOS box on the LAN, a phone, a public domain —
   * `localhost` is the *viewer's* own machine, which serves nothing, and every
   * image in the CMS and on the website is broken while the API reports 200 and
   * the files are plainly there on disk.
   *
   * Registered here rather than as an `APP_INTERCEPTOR` provider so the smoke
   * test, which boots through `configureApp`, exercises it too. It needs no
   * injection: see `media-origin.interceptor.ts` for what it rewrites and what
   * it deliberately leaves alone.
   */
  app.useGlobalInterceptors(new MediaOriginInterceptor());

  app.useGlobalFilters(new AllExceptionsFilter());
}
