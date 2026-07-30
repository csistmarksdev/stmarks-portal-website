import { NotFoundException } from "@nestjs/common";
import { isValidObjectId, Model } from "mongoose";
import type {
  FilterQuery,
  HydratedDocument,
  SortOrder,
  UpdateQuery,
} from "mongoose";

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
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
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
