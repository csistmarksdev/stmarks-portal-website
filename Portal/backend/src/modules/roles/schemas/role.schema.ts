import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { Permission } from "@portal/shared";
import { HydratedDocument } from "mongoose";

export type RoleDocument = HydratedDocument<Role>;

/**
 * A custom role made by an administrator. The built-in roles are not stored —
 * their permissions are fixed in `@portal/shared` — so this collection only
 * ever holds the extra ones.
 */
@Schema({ timestamps: true, collection: "roles" })
export class Role {
  /** Stable identifier stored on users; never changes after creation. */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  permissions: Permission[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
