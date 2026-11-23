import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { CHAT_RETENTION_DAYS } from "@portal/shared";
import { HydratedDocument } from "mongoose";

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "chat_messages" })
export class Message {
  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  body: string;

  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1 });
/*
 * Auto-deletion: MongoDB's TTL monitor removes each message this long after it
 * was sent. The monitor sweeps about once a minute, so queries also filter on
 * the cut-off (see ChatService) to make the limit exact.
 */
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: CHAT_RETENTION_DAYS * 86_400 });
