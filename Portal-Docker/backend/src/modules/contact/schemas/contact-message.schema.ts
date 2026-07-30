import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ContactMessageDocument = HydratedDocument<ContactMessageEntity>;

@Schema({ timestamps: true, collection: "contact_messages" })
export class ContactMessageEntity {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false, index: true })
  read: boolean;
}

export const ContactMessageSchema =
  SchemaFactory.createForClass(ContactMessageEntity);
