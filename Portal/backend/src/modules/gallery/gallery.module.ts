import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { GalleryAdminController } from "./gallery.admin.controller";
import { GalleryPublicController } from "./gallery.public.controller";
import { GalleryService } from "./gallery.service";
import {
  GalleryAlbumEntity,
  GalleryAlbumSchema,
} from "./schemas/gallery-album.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GalleryAlbumEntity.name, schema: GalleryAlbumSchema },
    ]),
    AuditModule,
  ],
  controllers: [GalleryPublicController, GalleryAdminController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
