import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { CHAT_RETENTION_DAYS } from "@portal/shared";
import { HydratedDocument } from "mongoose";

export type ConversationDocument = HydratedDocument<Conversation>;

/** A one-to-one conversation between two Portal accounts. */
@Schema({ timestamps: true, collection: "chat_conversations" })
export class Conversation {
  /** The two user ids, sorted, so a pair has exactly one conversation. */
  @Prop({ type: [String], required: true, index: true })
  participants: string[];

  /** `participants` joined — the uniqueness key for the pair. */
  @Prop({ required: true, unique: true })
  key: string;

  /** Denormalised so the conversation list needs no message query. */
  @Prop({
    type: { body: String, senderId: String, createdAt: Date },
    _id: false,
  })
  lastMessage?: { body: string; senderId: string; createdAt: Date };

  /** userId → when they last read the conversation. */
  @Prop({ type: Map, of: Date, default: {} })
  reads: Map<string, Date>;

  updatedAt: Date;
  createdAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participants: 1, updatedAt: -1 });
/*
 * A conversation goes when its last message does — nothing would be left in
 * it. One that was opened but never written in has no `lastMessage` and is
 * never listed; the TTL index ignores it, which is harmless.
 */
ConversationSchema.index(
  { "lastMessage.createdAt": 1 },
  { expireAfterSeconds: CHAT_RETENTION_DAYS * 86_400 },
);
