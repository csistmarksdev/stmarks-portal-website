import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipSlug,
  type ImageAsset,
  type LocalizedText,
  type PublishStatus,
} from "@portal/shared";
import { HydratedDocument } from "mongoose";

import {
  ImageAssetSchema,
  LocalizedTextSchema,
} from "../../../common/schemas/sub-schemas";

export type ChurchEventDocument = HydratedDocument<ChurchEventEntity>;

@Schema({ timestamps: true, collection: "events" })
export class ChurchEventEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true, enum: PUBLISH_STATUSES, default: "draft", index: true })
  status: PublishStatus;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  summary: LocalizedText;

  @Prop({ type: [LocalizedTextSchema], default: [] })
  description: LocalizedText[];

  @Prop({ required: true, index: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ type: LocalizedTextSchema, required: true })
  location: LocalizedText;

  @Prop({ type: ImageAssetSchema })
  image?: ImageAsset;

  @Prop({ enum: FELLOWSHIP_SLUGS, index: true })
  fellowshipSlug?: FellowshipSlug;

  @Prop({ type: LocalizedTextSchema })
  organiser?: LocalizedText;

  @Prop({ default: false, index: true })
  featured: boolean;
}

export const ChurchEventSchema =
  SchemaFactory.createForClass(ChurchEventEntity);
