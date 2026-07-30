import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipSlug,
  type GalleryPhoto,
  type ImageAsset,
  type LocalizedText,
  type PublishStatus,
} from "@portal/shared";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

import {
  ImageAssetSchema,
  LocalizedTextOptionalSchema,
  LocalizedTextSchema,
} from "../../../common/schemas/sub-schemas";

export type GalleryAlbumDocument = HydratedDocument<GalleryAlbumEntity>;

/** Optional clip on a gallery item; `image` then acts as its poster frame. */
const GalleryVideoSchema = new MongooseSchema(
  {
    url: { type: String, required: true },
    provider: { type: String, enum: ["file", "youtube", "vimeo"] },
  },
  { _id: false },
);

/** Photo sub-document — carries its own stable string id (not a Mongo _id). */
const GalleryPhotoSchema = new MongooseSchema<GalleryPhoto>(
  {
    id: { type: String, required: true },
    image: { type: ImageAssetSchema, required: true },
    caption: { type: LocalizedTextOptionalSchema },
    video: { type: GalleryVideoSchema },
  },
  { _id: false },
);

@Schema({ timestamps: true, collection: "gallery_albums" })
export class GalleryAlbumEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true, enum: PUBLISH_STATUSES, default: "draft", index: true })
  status: PublishStatus;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  description?: LocalizedText;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ type: ImageAssetSchema, required: true })
  cover: ImageAsset;

  @Prop({ type: [GalleryPhotoSchema], default: [] })
  photos: GalleryPhoto[];

  @Prop({ enum: FELLOWSHIP_SLUGS, index: true })
  fellowshipSlug?: FellowshipSlug;

  /**
   * Churchwide album — surfaces in every fellowship's gallery instead of
   * belonging to one (contract §5.3).
   */
  @Prop({ default: false, index: true })
  shared?: boolean;
}

export const GalleryAlbumSchema =
  SchemaFactory.createForClass(GalleryAlbumEntity);
