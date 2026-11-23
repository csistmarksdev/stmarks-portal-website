import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { SiteSettingEntity, SiteSettingSchema } from "./schemas/site-setting.schema";
import { SiteAdminController, SitePublicController } from "./site.controller";
import { SiteService } from "./site.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SiteSettingEntity.name, schema: SiteSettingSchema }]),
    AuditModule,
  ],
  controllers: [SitePublicController, SiteAdminController],
  providers: [SiteService],
})
export class SiteModule {}
