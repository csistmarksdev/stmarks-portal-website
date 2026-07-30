import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import { EventsAdminController } from "./events.admin.controller";
import { EventsPublicController } from "./events.public.controller";
import { EventsRepository } from "./events.repository";
import { EventsService } from "./events.service";
import { ChurchEventEntity, ChurchEventSchema } from "./schemas/event.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChurchEventEntity.name, schema: ChurchEventSchema },
    ]),
    AuditModule,
  ],
  controllers: [EventsPublicController, EventsAdminController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
