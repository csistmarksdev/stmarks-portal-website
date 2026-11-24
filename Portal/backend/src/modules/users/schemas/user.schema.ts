import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { RoleKey } from "@portal/shared";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: "users" })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  /** Built-in role or a custom role's key - checked against `roles` on write. */
  @Prop({ required: true, trim: true, default: "editor" })
  role: RoleKey;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  lastLoginAt?: Date;

  /** Hash of the currently valid refresh token (rotation invalidates old ones). */
  @Prop({ select: false })
  refreshTokenHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
