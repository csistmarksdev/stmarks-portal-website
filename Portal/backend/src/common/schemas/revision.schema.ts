import { Schema as MongooseSchema } from "mongoose";

/**
 * A change to a live record waiting for approval (see `ContentRevision` in
 * `@portal/shared`). Declared once and added to every content schema as
 * `@Prop(REVISION_PROP) revision?: StoredRevision`.
 */
export interface StoredRevision {
  changes: Record<string, unknown>;
  submittedBy: { userId: string; name: string };
  submittedAt: Date;
}

export const REVISION_PROP = {
  type: {
    changes: MongooseSchema.Types.Mixed,
    submittedBy: { userId: String, name: String },
    submittedAt: Date,
  },
  _id: false,
} as const;

/** Who last sent a record for approval — so they can be told the outcome. */
export const SUBMITTER_PROP = {
  type: { userId: String, name: String },
  _id: false,
} as const;
