import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditModule } from "../audit/audit.module";
import {
  ContactAdminController,
  ContactPublicController,
} from "./contact.controller";
import { ContactService } from "./contact.service";
import {
  ContactMessageEntity,
  ContactMessageSchema,
} from "./schemas/contact-message.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactMessageEntity.name, schema: ContactMessageSchema },
    ]),
    AuditModule,
  ],
  controllers: [ContactPublicController, ContactAdminController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
