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

export type ChurchEventDocument = HydratedDocument<ChurchEventEntity>;

@Schema({ timestamps: true, collection: "events" })
export class ChurchEventEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  /**
   * Slugs this event was published under before, kept so old links and
   * search results still find it (the website redirects them to `slug`).
   */
  @Prop({ type: [String], default: [], index: true })
  previousSlugs: string[];

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

  /** F-049: not public before this instant. Unset = no schedule. */
  @Prop({ type: Date, index: true })
  publishAt?: Date;
}

export const ChurchEventSchema =
  SchemaFactory.createForClass(ChurchEventEntity);
