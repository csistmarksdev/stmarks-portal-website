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
import {
  REVISION_PROP,
  SUBMITTER_PROP,
  type StoredRevision,
} from "../../../common/schemas/revision.schema";

export type AnnouncementDocument = HydratedDocument<AnnouncementEntity>;

@Schema({ timestamps: true, collection: "announcements" })
export class AnnouncementEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

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
  body: LocalizedText;

  @Prop({ required: true, index: true })
  publishedAt: Date;

  @Prop({ default: false, index: true })
  pinned: boolean;

  @Prop({ enum: FELLOWSHIP_SLUGS, index: true })
  fellowshipSlug?: FellowshipSlug;

  /** F-049: not public before this instant. Unset = no schedule. */
  @Prop({ type: Date, index: true })
  publishAt?: Date;

  /** F-049: not public from this instant on. Unset = never expires. */
  @Prop({ type: Date, index: true })
  expiresAt?: Date;
}

export const AnnouncementSchema =
  SchemaFactory.createForClass(AnnouncementEntity);
