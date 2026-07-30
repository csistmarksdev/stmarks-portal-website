import { Schema } from "mongoose";
import type { ImageAsset, LocalizedText } from "@portal/shared";

/**
 * Reusable sub-document schemas (no _id of their own).
 * Stored exactly as the API returns them, so serialization stays trivial.
 */

export const LocalizedTextSchema = new Schema<LocalizedText>(
  {
    en: { type: String, required: true, default: "" },
    ta: { type: String, required: true, default: "" },
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

export const ImageAssetSchema = new Schema<ImageAsset>(
  {
    url: { type: String, required: true },
    alt: { type: LocalizedTextSchema, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    blurDataURL: { type: String },
  },
  { _id: false },
);
