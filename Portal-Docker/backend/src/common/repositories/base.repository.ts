import { NotFoundException } from "@nestjs/common";
import { isValidObjectId, Model } from "mongoose";
import type {
  FilterQuery,
  HydratedDocument,
  SortOrder,
  UpdateQuery,
} from "mongoose";

/**
 * Rewrites `field: null` in an update into `$unset: { field: 1 }`.
 *
 * A PATCH body has to be able to say three different things: leave this alone
 * (omit the key), set it to this (send a value), and *remove* it (send null).
 * Mongo's `$set: { coverImage: null }` does the first two and gets the third
 * wrong — it stores a null rather than removing the field, which then
 * serialises back out as `coverImage: null` where the contract says the key is
 * simply absent.
 *
 * Without this there is no way to express removal at all, and the CMS was
 * quietly broken because of it: clearing a post's cover image sent no
 * `coverImage` key, the update left the old one in place, and the form reported
 * a successful save of a change that never happened.
 *
 * Keys already beginning with `$` are operators the caller wrote deliberately
 * (`$push`, `$pull`, an explicit `$unset`) and pass through untouched, merged
 * with anything derived here.
 */
function withRemovals<T>(update: UpdateQuery<T>): UpdateQuery<T> {
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  const operators: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(update)) {
    if (key.startsWith("$")) operators[key] = value;
    else if (value === null) unset[key] = 1;
    else set[key] = value;
  }

  const merged: Record<string, unknown> = { ...operators };
  const mergedSet = { ...(operators.$set as object), ...set };
  const mergedUnset = { ...(operators.$unset as object), ...unset };

  if (Object.keys(mergedSet).length > 0) merged.$set = mergedSet;
  if (Object.keys(mergedUnset).length > 0) merged.$unset = mergedUnset;

  return merged as UpdateQuery<T>;
}

/**
 * Thin generic data-access layer over a Mongoose model. Content services
 * compose these primitives; controllers never touch models directly.
 */
export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  create(data: Partial<T>): Promise<HydratedDocument<T>> {
    return this.model.create(data as T);
  }

  find(
    filter: FilterQuery<T> = {},
    sort: Record<string, SortOrder> = {},
    skip = 0,
    limit?: number,
  ): Promise<HydratedDocument<T>[]> {
    let query = this.model.find(filter).sort(sort).skip(skip);
    if (limit !== undefined) query = query.limit(limit);
    return query.exec();
  }

  findOne(filter: FilterQuery<T>): Promise<HydratedDocument<T> | null> {
    return this.model.findOne(filter).exec();
  }

  findById(id: string): Promise<HydratedDocument<T> | null> {
    if (!isValidObjectId(id)) return Promise.resolve(null);
    return this.model.findById(id).exec();
  }

  async findByIdOrThrow(id: string): Promise<HydratedDocument<T>> {
    const doc = await this.findById(id);
    if (!doc) {
      throw new NotFoundException(
        `${this.model.modelName} ${id} was not found`,
      );
    }
    return doc;
  }

  async updateById(
    id: string,
    update: UpdateQuery<T>,
  ): Promise<HydratedDocument<T>> {
    const doc = await this.model
      .findByIdAndUpdate(id, withRemovals(update), {
        new: true,
        runValidators: true,
      })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `${this.model.modelName} ${id} was not found`,
      );
    }
    return doc;
  }

  async deleteById(id: string): Promise<HydratedDocument<T>> {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) {
      throw new NotFoundException(
        `${this.model.modelName} ${id} was not found`,
      );
    }
    return doc;
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<void> {
    await this.model.updateMany(filter, update).exec();
  }

  count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    return (await this.model.exists(filter).exec()) !== null;
  }
}
