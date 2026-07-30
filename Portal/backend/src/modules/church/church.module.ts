import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { ChurchAdminController } from "./church.admin.controller";
import { ChurchPublicController } from "./church.public.controller";
import { ChurchService } from "./church.service";
import { SingletonEntity, SingletonSchema } from "./schemas/singleton.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SingletonEntity.name, schema: SingletonSchema },
    ]),
    AuditModule,
  ],
  controllers: [ChurchPublicController, ChurchAdminController],
  providers: [ChurchService],
  exports: [ChurchService],
})
export class ChurchModule {}
