import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipSlug,
  type ImageAsset,
  type LocalizedText,
  type PublishStatus,
  type SeoMeta,
} from "@portal/shared";
import { HydratedDocument } from "mongoose";

import {
  ImageAssetSchema,
  LocalizedTextSchema,
  SeoSchema,
} from "../../../common/schemas/sub-schemas";
import {
  REVISION_PROP,
  SUBMITTER_PROP,
  type StoredRevision,
} from "../../../common/schemas/revision.schema";

export type BlogPostDocument = HydratedDocument<BlogPostEntity>;

@Schema({ timestamps: true, collection: "blog_posts" })
export class BlogPostEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  /** Search-engine title, description and keywords. */
  @Prop({ type: SeoSchema })
  seo?: SeoMeta;

  @Prop({ required: true, enum: PUBLISH_STATUSES, default: "draft", index: true })
  status: PublishStatus;

  /** A change to this live record waiting for approval. */
  @Prop(REVISION_PROP)
  revision?: StoredRevision;

  /** Who last sent this for approval, to be told the outcome. */
  @Prop(SUBMITTER_PROP)
  submittedBy?: { userId: string; name: string };

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

  /** F-049: not public before this instant. Unset = no schedule. */
  @Prop({ type: Date, index: true })
  publishAt?: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPostEntity);
