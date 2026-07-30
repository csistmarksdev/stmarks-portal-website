import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import helmet from "helmet";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
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

  app.enableCors({
    origin: corsOriginChecker({
      allowed: config.get<string[]>("corsOrigins", []),
      allowPrivateNetwork: config.get<boolean>("corsAllowPrivateNetwork", true),
    }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
