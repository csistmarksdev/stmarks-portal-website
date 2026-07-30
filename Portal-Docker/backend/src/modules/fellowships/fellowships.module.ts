import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { FellowshipsAdminController } from "./fellowships.admin.controller";
import { FellowshipsPublicController } from "./fellowships.public.controller";
import { FellowshipsService } from "./fellowships.service";
import {
  FellowshipEntity,
  FellowshipSchema,
} from "./schemas/fellowship.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FellowshipEntity.name, schema: FellowshipSchema },
    ]),
    AuditModule,
  ],
  controllers: [FellowshipsPublicController, FellowshipsAdminController],
  providers: [FellowshipsService],
  exports: [FellowshipsService],
})
export class FellowshipsModule {}
