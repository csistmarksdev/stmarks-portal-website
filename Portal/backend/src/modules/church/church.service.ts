import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "node:crypto";
import { Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { canPublish } from "../../common/utils/approval";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import {
  SingletonEntity,
  type SingletonKey,
} from "./schemas/singleton.schema";

const CHURCH_LABELS: Record<SingletonKey, string> = {
  "weekly-verse": "weekly verse",
  "service-timings": "service timings",
  "pastor-message": "pastor's message",
};

const churchSubject = (key: SingletonKey) => ({
  label: CHURCH_LABELS[key],
  link: `/church/${key}`,
});

/** Cache tag for all church singletons (contract §4). */
const TAG = "church";

@Injectable()
export class ChurchService {
  constructor(
    @InjectModel(SingletonEntity.name)
    private readonly model: Model<SingletonEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly notifier: NotificationsService,
  ) {}

  /** Returns the stored payload exactly as the public API serves it. */
  async get<T>(key: SingletonKey): Promise<T> {
    const doc = await this.model.findOne({ key }).lean().exec();
    if (!doc) {
      throw new NotFoundException(
        `Church content "${key}" has not been set up yet. Run the seed or save it in the CMS`,
      );
    }
    return doc.data as T;
  }

  /**
   * Saves a singleton. An approver's save goes live at once (and settles any
   * waiting submission - approving one is simply saving it); anyone else's is
   * held as a submission for an admin to approve or reject (approval rule,
   * church requests 22 & 23 Nov 2026).
   */
  async set<T>(
    key: SingletonKey,
    data: T,
    actor: AuthenticatedUser,
  ): Promise<{ status: "published" | "pending" }> {
    if (canPublish(actor)) {
      const before = await this.model.findOne({ key }).lean().exec();
      await this.model
        .findOneAndUpdate(
          { key },
          { $set: { key, data }, $unset: { pending: 1 } },
          { upsert: true, new: true },
        )
        .exec();
      await this.audit.log(
        actor,
        before?.pending ? "publish" : "update",
        TAG,
        key,
        before?.pending
          ? `Approved ${before.pending.submittedBy.name}'s change to church "${key}"`
          : `Updated church "${key}"`,
      );
      this.revalidate.trigger(TAG);
      if (before?.pending) {
        await this.notifier.approved(actor, before.pending.submittedBy, churchSubject(key), true);
      }
      return { status: "published" };
    }

    const existing = await this.model.findOne({ key }).exec();
    if (!existing) {
      throw new NotFoundException(`Church content "${key}" has not been set up yet`);
    }
    existing.pending = {
      data,
      submittedBy: { userId: actor.userId, name: actor.name },
      submittedAt: new Date(),
    };
    await existing.save();
    await this.audit.log(actor, "update", TAG, key, `Submitted a change to church "${key}" for approval`);
    await this.notifier.changesSubmitted(actor, churchSubject(key));
    return { status: "pending" };
  }

  /** The waiting submission, if any - wrapped, so "none" is a real JSON body. */
  async pending(key: SingletonKey) {
    const doc = await this.model.findOne({ key }).lean().exec();
    if (!doc?.pending) return { pending: null };
    return {
      pending: {
        data: doc.pending.data,
        submittedBy: doc.pending.submittedBy,
        submittedAt: new Date(doc.pending.submittedAt).toISOString(),
      },
    };
  }

  /** Discards a waiting submission; the live version is untouched. */
  async reject(key: SingletonKey, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.model.findOne({ key }).exec();
    if (!doc?.pending) throw new NotFoundException("There is no change waiting for approval");
    const who = doc.pending.submittedBy.name;
    const submitter = doc.pending.submittedBy;
    doc.pending = undefined;
    await doc.save();
    await this.audit.log(actor, "update", TAG, key, `Rejected ${who}'s change to church "${key}"`);
    await this.notifier.rejected(actor, submitter, churchSubject(key), true);
  }

  /** Ensures list items carry stable ids (timings, milestones, values). */
  withIds<T extends { id?: string }>(items: T[]): (T & { id: string })[] {
    return items.map((item) => ({ ...item, id: item.id ?? randomUUID() }));
  }
}
