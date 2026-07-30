import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { LocalizedText, MediaKind } from "@portal/shared";
import { HydratedDocument } from "mongoose";

import { LocalizedTextSchema } from "../../../common/schemas/sub-schemas";

export type MediaDocument = HydratedDocument<MediaEntity>;

@Schema({ timestamps: true, collection: "media" })
export class MediaEntity {
  @Prop({ required: true, enum: ["image", "video", "pdf", "document"], index: true })
  kind: MediaKind;

  /** Path relative to the upload root, e.g. "images/abc.jpg". */
  @Prop({ required: true })
  path: string;

  /** Thumbnail path (images only), e.g. "thumbs/abc.webp". */
  @Prop()
  thumbnailPath?: string;

  /** Original filename as uploaded. */
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimeType: string;

  /** Uppercase extension, e.g. "PDF", "JPG". */
  @Prop({ required: true })
  format: string;

  @Prop({ required: true })
  sizeBytes: number;

  /** Human-readable size, e.g. "1.2 MB" — computed at upload. */
  @Prop({ required: true })
  size: string;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  blurDataURL?: string;

  @Prop({ type: LocalizedTextSchema })
  alt?: LocalizedText;

  /** Managed by Mongoose `timestamps: true` — declared for typing only. */
  createdAt?: Date;
  updatedAt?: Date;
}

export const MediaSchema = SchemaFactory.createForClass(MediaEntity);
