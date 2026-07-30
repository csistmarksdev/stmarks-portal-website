import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  DOWNLOAD_CATEGORIES,
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type DownloadCategory,
  type FellowshipSlug,
  type LocalizedText,
  type PublishStatus,
} from "@portal/shared";
import { HydratedDocument } from "mongoose";

import { LocalizedTextSchema } from "../../../common/schemas/sub-schemas";

export type DownloadDocument = HydratedDocument<DownloadEntity>;

@Schema({ timestamps: true, collection: "downloads" })
export class DownloadEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true, enum: PUBLISH_STATUSES, default: "draft", index: true })
  status: PublishStatus;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  description?: LocalizedText;

  @Prop({ required: true, enum: DOWNLOAD_CATEGORIES, index: true })
  category: DownloadCategory;

  /** Direct public URL of the file (media library asset). */
  @Prop({ required: true })
  fileUrl: string;

  /** Uppercase extension, e.g. "PDF" — computed at upload time. */
  @Prop({ required: true })
  format: string;

  /** Human-readable size, e.g. "1.2 MB" — computed at upload time. */
  @Prop({ required: true })
  size: string;

  @Prop({ required: true, index: true })
  publishedAt: Date;

  @Prop({ enum: FELLOWSHIP_SLUGS, index: true })
  fellowshipSlug?: FellowshipSlug;
}

export const DownloadSchema = SchemaFactory.createForClass(DownloadEntity);
