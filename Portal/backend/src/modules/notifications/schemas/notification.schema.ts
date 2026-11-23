import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { NOTIFICATION_RETENTION_DAYS, type NotificationKind } from "@portal/shared";
import { HydratedDocument } from "mongoose";

export type NotificationDocument = HydratedDocument<NotificationEntity>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "notifications" })
export class NotificationEntity {
  /** The recipient. */
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  kind: NotificationKind;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  link: string;

  @Prop({ type: { userId: String, name: String }, _id: false, required: true })
  actor: { userId: string; name: string };

  @Prop({ default: false })
  read: boolean;

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationEntity);
NotificationSchema.index({ userId: 1, createdAt: -1 });
// Old notifications clear themselves out.
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_RETENTION_DAYS * 86_400 },
);
