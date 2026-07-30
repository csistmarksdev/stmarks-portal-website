import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type SingletonDocument = HydratedDocument<SingletonEntity>;

export type SingletonKey = "service-timings" | "pastor-message" | "weekly-verse";

export const SINGLETON_KEYS: readonly SingletonKey[] = [
  "service-timings",
  "pastor-message",
  "weekly-verse",
] as const;

/**
 * Church-level singletons (contract §5.8). One document per key. The payload
 * is stored exactly as the public API returns it; shape is enforced by the
 * per-key admin DTOs, not by Mongoose.
 *
 * Only content that actually changes lives here. The church profile, history,
 * vision & mission, diocese and hero slides are hardcoded in the Website —
 * write-once material that gained nothing from being CMS-managed.
 */
@Schema({ timestamps: true, collection: "church_singletons" })
export class SingletonEntity {
  @Prop({ required: true, unique: true, enum: SINGLETON_KEYS })
  key: SingletonKey;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: unknown;
}

export const SingletonSchema = SchemaFactory.createForClass(SingletonEntity);
