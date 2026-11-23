import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { RolesModule } from "../roles/roles.module";
import { User, UserSchema } from "../users/schemas/user.schema";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationEntity, NotificationSchema } from "./schemas/notification.schema";

/** Global, so every content service can notify without wiring each module. */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationEntity.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RolesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
