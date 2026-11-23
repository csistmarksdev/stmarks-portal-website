import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type SiteSettingDocument = HydratedDocument<SiteSettingEntity>;

/**
 * Site-wide switches, one document per key. Only `maintenance` for now; the
 * key leaves room for others without another collection.
 */
@Schema({ timestamps: true, collection: "site_settings" })
export class SiteSettingEntity {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: unknown;

  @Prop({ type: { userId: String, name: String }, _id: false })
  updatedBy?: { userId: string; name: string };

  updatedAt: Date;
}

export const SiteSettingSchema = SchemaFactory.createForClass(SiteSettingEntity);
