import { Schema } from "mongoose";
import type { ImageAsset, LocalizedText } from "@portal/shared";

/**
 * Reusable sub-document schemas (no _id of their own).
 * Stored exactly as the API returns them, so serialization stays trivial.
 */

export const LocalizedTextSchema = new Schema<LocalizedText>(
  {
    en: { type: String, required: true, default: "" },
    /*
     * Not `required`: Mongoose's required check rejects an empty string, and
     * an empty Tamil text is allowed (see `LocalizedTextDto`) — the CMS saves
     * English-only drafts and flags the missing translation. With `required`
     * here every such save failed as an opaque 500, including creating an
     * album. The default still guarantees the key is always present.
     */
    ta: { type: String, default: "" },
  },
  { _id: false },
);

export const LocalizedTextOptionalSchema = new Schema(
  {
    en: { type: String },
    ta: { type: String },
  },
  { _id: false },
);

/**
 * Alt text: always present, but either language may still be empty. An image
 * picked before anyone described it must still be usable — the CMS shows a
 * "No alt text" warning on it instead. With the stricter LocalizedTextSchema
 * here, choosing such an image as a cover or album photo failed the whole save
 * with an opaque 500.
 */
const ImageAltSchema = new Schema<LocalizedText>(
  {
    en: { type: String, default: "" },
    ta: { type: String, default: "" },
  },
  { _id: false },
);

export const ImageAssetSchema = new Schema<ImageAsset>(
  {
    url: { type: String, required: true },
    alt: { type: ImageAltSchema, required: true, default: () => ({ en: "", ta: "" }) },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    blurDataURL: { type: String },
  },
  { _id: false },
);
