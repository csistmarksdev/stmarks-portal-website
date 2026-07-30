import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "node:crypto";
import { Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import {
  SingletonEntity,
  type SingletonKey,
} from "./schemas/singleton.schema";

/** Cache tag for all church singletons (contract §4). */
const TAG = "church";

@Injectable()
export class ChurchService {
  constructor(
    @InjectModel(SingletonEntity.name)
    private readonly model: Model<SingletonEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {}

  /** Returns the stored payload exactly as the public API serves it. */
  async get<T>(key: SingletonKey): Promise<T> {
    const doc = await this.model.findOne({ key }).lean().exec();
    if (!doc) {
      throw new NotFoundException(
        `Church content "${key}" has not been set up yet — run the seed or save it in the CMS`,
      );
    }
    return doc.data as T;
  }

  /** Upserts a singleton payload and audits the change. */
  async set<T>(
    key: SingletonKey,
    data: T,
    actor: AuthenticatedUser,
  ): Promise<T> {
    await this.model
      .findOneAndUpdate({ key }, { key, data }, { upsert: true, new: true })
      .exec();
    await this.audit.log(actor, "update", TAG, key, `Updated church "${key}"`);
    this.revalidate.trigger(TAG);
    return data;
  }

  /** Ensures list items carry stable ids (timings, milestones, values). */
  withIds<T extends { id?: string }>(items: T[]): (T & { id: string })[] {
    return items.map((item) => ({ ...item, id: item.id ?? randomUUID() }));
  }
}
