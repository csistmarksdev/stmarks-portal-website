import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { MediaRenameService } from "./media-rename.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { MediaEntity, MediaSchema } from "./schemas/media.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MediaEntity.name, schema: MediaSchema },
    ]),
    AuditModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaRenameService],
  exports: [MediaService, MediaRenameService],
})
export class MediaModule {}
