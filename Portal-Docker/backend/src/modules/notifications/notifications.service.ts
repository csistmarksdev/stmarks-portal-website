import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { NotificationKind, PortalNotification } from "@portal/shared";
import { isValidObjectId, Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { RolesService } from "../roles/roles.service";
import { User } from "../users/schemas/user.schema";
import { NotificationEntity } from "./schemas/notification.schema";

/** The content types that go through approval, and how to name and link them. */
export const APPROVAL_TYPES = {
  events: { noun: "event", route: "/events" },
  blog: { noun: "blog post", route: "/blog" },
  gallery: { noun: "album", route: "/gallery" },
  announcements: { noun: "announcement", route: "/announcements" },
  downloads: { noun: "download", route: "/downloads" },
  fellowships: { noun: "fellowship", route: "/fellowships" },
} as const;

export type ApprovalType = keyof typeof APPROVAL_TYPES;

/** Who sent something for approval - stored on the record as `submittedBy`. */
export interface Submitter {
  userId: string;
  name: string;
}

/** What a notification is about: a content record, or a church page. */
export interface Subject {
  /** e.g. `event "Carol Service"` or `weekly verse`. */
  label: string;
  link: string;
}

export function contentSubject(type: ApprovalType, id: string, title: string): Subject {
  const { noun, route } = APPROVAL_TYPES[type];
  return { label: `${noun} "${title}"`, link: `${route}/${id}` };
}

/**
 * In-app notifications for the approval workflow: approvers hear about
 * submissions; writers hear what became of theirs.
 *
 * Notifying is best effort - a failure is logged, never allowed to fail the
 * save that triggered it.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(NotificationEntity.name) private readonly model: Model<NotificationEntity>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly roles: RolesService,
  ) {}

  /* ---------------------------------------------------------------------- */
  /* Sending                                                                */
  /* ---------------------------------------------------------------------- */

  private async send(
    recipients: string[],
    kind: NotificationKind,
    title: string,
    link: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    // Nobody is notified of their own action.
    const to = [...new Set(recipients)].filter((id) => id && id !== actor.userId);
    if (to.length === 0) return;
    try {
      await this.model.insertMany(
        to.map((userId) => ({
          userId,
          kind,
          title,
          link,
          actor: { userId: actor.userId, name: actor.name },
        })),
      );
    } catch (error) {
      this.logger.warn(`Could not record notifications: ${(error as Error).message}`);
    }
  }

  /** Every active account that can approve (holds `content.publish`). */
  private async approvers(): Promise<string[]> {
    const active = await this.users.find({ active: true }).select("_id role").lean().exec();
    const allowed = await Promise.all(
      active.map(async (user) =>
        (await this.roles.permissionsFor(user.role)).includes("content.publish")
          ? String(user._id)
          : null,
      ),
    );
    return allowed.filter((id): id is string => id !== null);
  }

  /** A new item was submitted for approval. */
  async submitted(actor: AuthenticatedUser, subject: Subject): Promise<void> {
    await this.send(
      await this.approvers(),
      "submitted",
      `${actor.name} submitted the ${subject.label} for approval`,
      subject.link,
      actor,
    );
  }

  /** Changes to a live item (or church page) were submitted for approval. */
  async changesSubmitted(actor: AuthenticatedUser, subject: Subject): Promise<void> {
    await this.send(
      await this.approvers(),
      "changes-submitted",
      `${actor.name} sent changes to the ${subject.label} for approval`,
      subject.link,
      actor,
    );
  }

  async approved(
    actor: AuthenticatedUser,
    submitter: Submitter | undefined,
    subject: Subject,
    changes = false,
  ): Promise<void> {
    if (!submitter) return;
    await this.send(
      [submitter.userId],
      "approved",
      changes
        ? `${actor.name} approved your changes to the ${subject.label}. They are live`
        : `${actor.name} approved and published your ${subject.label}`,
      subject.link,
      actor,
    );
  }

  async rejected(
    actor: AuthenticatedUser,
    submitter: Submitter | undefined,
    subject: Subject,
    changes = false,
  ): Promise<void> {
    if (!submitter) return;
    await this.send(
      [submitter.userId],
      "rejected",
      changes
        ? `${actor.name} rejected your changes to the ${subject.label}`
        : `${actor.name} sent your ${subject.label} back to draft`,
      subject.link,
      actor,
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Reading                                                                */
  /* ---------------------------------------------------------------------- */

  private present(doc: NotificationEntity & { _id: unknown }): PortalNotification {
    return {
      id: String(doc._id),
      kind: doc.kind,
      title: doc.title,
      link: doc.link,
      actor: doc.actor,
      read: doc.read,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async list(me: AuthenticatedUser, limit = 50): Promise<PortalNotification[]> {
    const docs = await this.model
      .find({ userId: me.userId })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .lean()
      .exec();
    return docs.map((doc) => this.present(doc));
  }

  async unread(me: AuthenticatedUser): Promise<{ total: number }> {
    return { total: await this.model.countDocuments({ userId: me.userId, read: false }).exec() };
  }

  async markRead(id: string, me: AuthenticatedUser): Promise<void> {
    const result = isValidObjectId(id)
      ? await this.model.updateOne({ _id: id, userId: me.userId }, { $set: { read: true } }).exec()
      : null;
    if (!result?.matchedCount) throw new NotFoundException("Notification not found");
  }

  async markAllRead(me: AuthenticatedUser): Promise<void> {
    await this.model.updateMany({ userId: me.userId, read: false }, { $set: { read: true } }).exec();
  }
}

/**
 * Works out who to tell about a record moving from `before` to `after`, and
 * tells them. Called by every content service after a save or status change.
 */
export async function notifyTransition(
  notifier: NotificationsService,
  actor: AuthenticatedUser,
  approver: boolean,
  before: {
    status: string;
    submittedBy?: Submitter;
    revision?: { submittedBy: Submitter };
  },
  after: string,
  subject: Subject,
): Promise<void> {
  if (approver && before.revision) {
    // An approver's save applies the waiting changes.
    await notifier.approved(actor, before.revision.submittedBy, subject, true);
  } else if (approver && before.status === "pending" && after === "published") {
    await notifier.approved(actor, before.submittedBy, subject);
  } else if (approver && before.status === "pending" && after === "draft") {
    await notifier.rejected(actor, before.submittedBy, subject);
  } else if (!approver && after === "pending" && before.status !== "pending") {
    await notifier.submitted(actor, subject);
  }
}
