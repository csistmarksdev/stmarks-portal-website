import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { AuditAction, AuditLogEntry, Paginated } from "@portal/shared";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { serializeDoc } from "../../common/utils/serialize";
import { AuditLog } from "./schemas/audit-log.schema";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly model: Model<AuditLog>,
  ) {}

  /**
   * Records an admin action. Auditing must never break the main operation,
   * so failures are logged and swallowed.
   */
  async log(
    actor: AuthenticatedUser | null,
    action: AuditAction,
    resource: string,
    resourceId: string | undefined,
    summary: string,
    ip?: string,
  ): Promise<void> {
    try {
      await this.model.create({
        action,
        resource,
        resourceId,
        summary,
        userId: actor?.userId,
        userName: actor?.name,
        ip,
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${summary}`, error as Error);
    }
  }

  /**
   * Removes audit history older than `olderThanDays`, or all of it when that is
   * 0.
   *
   * Then records the purge itself. That is the point: an audit trail someone
   * can silently empty is not an audit trail, so clearing it always leaves a
   * line saying who cleared it, when, and how much went. Restricted to
   * `audit.delete`, which only a super-admin holds.
   */
  async purge(
    actor: AuthenticatedUser,
    olderThanDays: number,
    ip?: string,
  ): Promise<{ deleted: number }> {
    const filter: FilterQuery<AuditLog> = {};
    let scope = "all entries";

    if (olderThanDays > 0) {
      const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
      filter.createdAt = { $lt: cutoff };
      scope = `entries older than ${olderThanDays} day(s)`;
    }

    const { deletedCount } = await this.model.deleteMany(filter);
    const deleted = deletedCount ?? 0;

    await this.log(
      actor,
      "delete",
      "audit",
      undefined,
      `${actor.name} cleared ${deleted} audit entr${deleted === 1 ? "y" : "ies"} (${scope})`,
      ip,
    );

    return { deleted };
  }

  async list(options: {
    page: number;
    pageSize: number;
    action?: AuditAction;
    resource?: string;
    userId?: string;
  }): Promise<Paginated<AuditLogEntry>> {
    const filter: FilterQuery<AuditLog> = {};
    if (options.action) filter.action = options.action;
    if (options.resource) filter.resource = options.resource;
    if (options.userId) filter.userId = options.userId;

    const { page, pageSize } = options;
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => serializeDoc<AuditLogEntry>(doc)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }
}
