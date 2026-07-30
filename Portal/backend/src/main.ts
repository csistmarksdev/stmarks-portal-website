import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import configuration from "./config/configuration";
import { assertProductionConfig } from "./config/validate-production-config";
import { configureApp } from "./configure-app";
import { lanAddress } from "./common/utils/network";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService);
  const prefix = config.get<string>("apiPrefix", "v1");

  /*
   * Before anything listens: refuse to serve the internet on the development
   * fallbacks in `configuration.ts`. A deploy that forgets `JWT_ACCESS_SECRET`
   * would otherwise start cleanly and sign admin tokens with a string that is
   * in this repository. `configuration()` is a pure factory over `process.env`,
   * so this reads exactly what the app was configured with.
   */
  assertProductionConfig(configuration());

  /*
   * Swagger documents every admin route, including the shape of each write.
   * The routes are guarded, so this is not a way in — but it is a free map for
   * anyone probing, and a CMS for one parish has no audience for public API
   * docs. On in development, off in production unless explicitly re-enabled.
   */
  const docsEnabled =
    process.env.NODE_ENV !== "production" || process.env.ENABLE_API_DOCS === "true";

  if (docsEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("CSI St. Mark's Church — Portal API")
      .setDescription(
        "Public content API (the Website contract) + authenticated admin CMS API. " +
          "Public GET endpoints are unauthenticated; everything under /admin and /auth (except login/refresh) requires a Bearer token.",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>("port", 4000);
  // Bind every interface so the API answers on the LAN address too, not just
  // loopback — otherwise a phone on the same network gets connection refused.
  await app.listen(port, "0.0.0.0");

  const lan = lanAddress();
  /* eslint-disable no-console */
  console.log(`Portal API listening on port ${port}`);
  console.log(`  local    http://localhost:${port}/${prefix}   (Swagger: /docs)`);
  if (lan) console.log(`  network  http://${lan}:${port}/${prefix}`);
  console.log(`  media    ${config.get<string>("publicUrl")}/uploads`);
  /* eslint-enable no-console */
}

void bootstrap();
