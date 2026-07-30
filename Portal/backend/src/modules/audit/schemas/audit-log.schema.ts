import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { AuditAction } from "@portal/shared";
import { HydratedDocument } from "mongoose";

export type AuditLogDocument = HydratedDocument<AuditLog>;

const AUDIT_ACTIONS: AuditAction[] = [
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "publish",
  "unpublish",
  "archive",
  "pin",
  "upload",
];

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "audit_logs" })
export class AuditLog {
  @Prop({ required: true, enum: AUDIT_ACTIONS, index: true })
  action: AuditAction;

  @Prop({ required: true, index: true })
  resource: string;

  @Prop()
  resourceId?: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ index: true })
  userId?: string;

  @Prop()
  userName?: string;

  @Prop()
  ip?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
