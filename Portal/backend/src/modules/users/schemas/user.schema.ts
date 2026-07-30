import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { USER_ROLES, type UserRole } from "@portal/shared";
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

  @Prop({ required: true, enum: USER_ROLES, default: "editor" })
  role: UserRole;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  lastLoginAt?: Date;

  /** Hash of the currently valid refresh token (rotation invalidates old ones). */
  @Prop({ select: false })
  refreshTokenHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
