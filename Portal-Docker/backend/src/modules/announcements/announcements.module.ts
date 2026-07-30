import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { AnnouncementsAdminController } from "./announcements.admin.controller";
import { AnnouncementsPublicController } from "./announcements.public.controller";
import { AnnouncementsService } from "./announcements.service";
import {
  AnnouncementEntity,
  AnnouncementSchema,
} from "./schemas/announcement.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnnouncementEntity.name, schema: AnnouncementSchema },
    ]),
    AuditModule,
  ],
  controllers: [AnnouncementsPublicController, AnnouncementsAdminController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
