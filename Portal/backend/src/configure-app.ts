import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { corsOptionsDelegate } from "./common/utils/cors";
import { MediaRenameService } from "./modules/media/media-rename.service";

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
   * Decides what `req.ip` resolves to - see `trustProxy` in `configuration.ts`
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
   * compress by roughly an order of magnitude - the single biggest win for
   * the CMS over a slow connection. Already-compressed uploads are skipped by
   * the default filter.
   */
  app.use(compression());

  /*
   * Files renamed to readable names answer at their old path with a permanent
   * redirect, so links already shared or indexed by search engines keep
   * working. Registered here, ahead of the static /uploads handler (which
   * mounts during app.init and does not fall through).
   */
  const renamer = app.get(MediaRenameService, { strict: false });
  app.use("/uploads", (request: Request, response: Response, next: NextFunction) => {
    const target = renamer.redirectFor(request.path);
    if (target) {
      response.redirect(301, `${request.baseUrl}/${target}`);
      return;
    }
    next();
  });

  // Let Nest close Mongo connections and finish in-flight work on SIGTERM
  // rather than dying mid-request when the container is replaced.
  app.enableShutdownHooks();

  /*
   * F-068: public reads may be open to any origin; writes, sign-in and the
   * admin API only ever answer the configured origins. See `cors.ts`.
   */
  app.enableCors(
    corsOptionsDelegate({
      apiPrefix: config.get<string>("apiPrefix", "v1"),
      allowed: config.get<string[]>("corsOrigins", []),
      allowPrivateNetwork: config.get<boolean>("corsAllowPrivateNetwork", true),
      publicReadAnyOrigin: config.get<boolean>("corsPublicReadAnyOrigin", false),
      production: process.env.NODE_ENV === "production",
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
