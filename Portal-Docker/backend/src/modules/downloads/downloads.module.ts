import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { DownloadsAdminController } from "./downloads.admin.controller";
import { DownloadsPublicController } from "./downloads.public.controller";
import { DownloadsService } from "./downloads.service";
import { DownloadEntity, DownloadSchema } from "./schemas/download.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DownloadEntity.name, schema: DownloadSchema },
    ]),
    AuditModule,
  ],
  controllers: [DownloadsPublicController, DownloadsAdminController],
  providers: [DownloadsService],
  exports: [DownloadsService],
})
export class DownloadsModule {}
