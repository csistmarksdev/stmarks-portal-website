import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { join } from "node:path";

import configuration from "./config/configuration";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BlogModule } from "./modules/blog/blog.module";
import { ChurchModule } from "./modules/church/church.module";
import { ContactModule } from "./modules/contact/contact.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DownloadsModule } from "./modules/downloads/downloads.module";
import { EventsModule } from "./modules/events/events.module";
import { HealthModule } from "./modules/health/health.module";
import { FellowshipsModule } from "./modules/fellowships/fellowships.module";
import { GalleryModule } from "./modules/gallery/gallery.module";
import { MediaModule } from "./modules/media/media.module";
import { RevalidateModule } from "./modules/revalidate/revalidate.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("mongodbUri"),
      }),
    }),
    // Baseline rate limit for every route; auth/contact tighten it further.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    // Uploaded media served at /uploads/** (outside the API prefix).
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          rootPath: join(process.cwd(), config.get<string>("uploadDir", "uploads")),
          serveRoot: "/uploads",
          serveStaticOptions: { index: false, fallthrough: false },
        },
      ],
    }),
    HealthModule,
    RevalidateModule,
    AuditModule,
    AuthModule,
    UsersModule,
    MediaModule,
    EventsModule,
    BlogModule,
    GalleryModule,
    AnnouncementsModule,
    DownloadsModule,
    FellowshipsModule,
    ChurchModule,
    ContactModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
