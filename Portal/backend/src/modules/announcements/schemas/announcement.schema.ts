import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipSlug,
  type LocalizedText,
  type PublishStatus,
} from "@portal/shared";
import { HydratedDocument } from "mongoose";

import { LocalizedTextSchema } from "../../../common/schemas/sub-schemas";

export type AnnouncementDocument = HydratedDocument<AnnouncementEntity>;

@Schema({ timestamps: true, collection: "announcements" })
export class AnnouncementEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true, enum: PUBLISH_STATUSES, default: "draft", index: true })
  status: PublishStatus;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  body: LocalizedText;

  @Prop({ required: true, index: true })
  publishedAt: Date;

  @Prop({ default: false, index: true })
  pinned: boolean;

  @Prop({ enum: FELLOWSHIP_SLUGS, index: true })
  fellowshipSlug?: FellowshipSlug;
}

export const AnnouncementSchema =
  SchemaFactory.createForClass(AnnouncementEntity);
