import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipCommitteeMember,
  type FellowshipSlug,
  type ImageAsset,
  type LocalizedText,
  type PublishStatus,
} from "@portal/shared";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

import {
  ImageAssetSchema,
  LocalizedTextSchema,
} from "../../../common/schemas/sub-schemas";
import {
  REVISION_PROP,
  SUBMITTER_PROP,
  type StoredRevision,
} from "../../../common/schemas/revision.schema";

export type FellowshipDocument = HydratedDocument<FellowshipEntity>;

const CommitteeMemberSchema = new MongooseSchema<FellowshipCommitteeMember>(
  {
    id: { type: String, required: true },
    name: { type: LocalizedTextSchema, required: true },
    designation: { type: LocalizedTextSchema, required: true },
    image: { type: ImageAssetSchema },
  },
  { _id: false },
);

const CoordinatorSchema = new MongooseSchema(
  {
    name: { type: LocalizedTextSchema, required: true },
    phone: { type: String },
    email: { type: String },
  },
  { _id: false },
);

@Schema({ timestamps: true, collection: "fellowships" })
export class FellowshipEntity {
  /** Fixed enum - the Website routes are built around these eight slugs. */
  @Prop({ required: true, unique: true, enum: FELLOWSHIP_SLUGS, index: true })
  slug: FellowshipSlug;

  @Prop({ required: true, enum: PUBLISH_STATUSES, default: "published", index: true })
  status: PublishStatus;

  /** A change to this live record waiting for approval. */
  @Prop(REVISION_PROP)
  revision?: StoredRevision;

  /** Who last sent this for approval, to be told the outcome. */
  @Prop(SUBMITTER_PROP)
  submittedBy?: { userId: string; name: string };

  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  tagline: LocalizedText;

  @Prop({ type: [LocalizedTextSchema], default: [] })
  about: LocalizedText[];

  @Prop({ type: LocalizedTextSchema, required: true })
  vision: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  schedule: LocalizedText;

  @Prop()
  memberCount?: number;

  @Prop({ type: ImageAssetSchema, required: true })
  banner: ImageAsset;

  @Prop({ type: [CommitteeMemberSchema], default: [] })
  committee: FellowshipCommitteeMember[];

  @Prop({ type: CoordinatorSchema, required: true })
  coordinator: { name: LocalizedText; phone?: string; email?: string };

  @Prop({ required: true, default: 0 })
  order: number;
}

export const FellowshipSchema = SchemaFactory.createForClass(FellowshipEntity);
