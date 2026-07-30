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

export type BlogPostDocument = HydratedDocument<BlogPostEntity>;

@Schema({ timestamps: true, collection: "blog_posts" })
export class BlogPostEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true, enum: PUBLISH_STATUSES, default: "draft", index: true })
  status: PublishStatus;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  excerpt: LocalizedText;

  @Prop({ type: [LocalizedTextSchema], default: [] })
  body: LocalizedText[];

  @Prop({ required: true, index: true })
  publishedAt: Date;

  @Prop({ type: LocalizedTextSchema, required: true })
  author: LocalizedText;

  @Prop({ type: ImageAssetSchema })
  coverImage?: ImageAsset;

  @Prop({ index: true })
  eventSlug?: string;

  @Prop({ enum: FELLOWSHIP_SLUGS, index: true })
  fellowshipSlug?: FellowshipSlug;

  /** Computed server-side from `body` on every write (contract §5.2). */
  @Prop()
  readingMinutes?: number;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPostEntity);
