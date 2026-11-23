import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ChurchEvent,
  EventStatus,
  FellowshipSlug,
  Paginated,
  PublishStatus,
  WithSchedule,
} from "@portal/shared";
import { ADMIN_ONLY_FIELDS } from "@portal/shared";
import type { FilterQuery, SortOrder } from "mongoose";

import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { resolveList } from "../../common/utils/pagination";
import { serializeDoc } from "../../common/utils/serialize";
import { containsInsensitive } from "../../common/utils/mongo";
import { slugify, uniqueSlug } from "../../common/utils/slugify";
import {
  assertNoPlaceholderContent,
  assertSlugYearMatchesDate,
} from "../../common/utils/content-guards";
import { publiclyVisible, scheduleValue } from "../../common/utils/publication";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { CreateEventDto, UpdateEventDto } from "./dto/create-event.dto";
import type { ChurchEventDocument, ChurchEventEntity } from "./schemas/event.schema";
import { EventsRepository } from "./events.repository";
import {
  assertMayDelete,
  assertMayWrite,
  canPublish,
  defaultStatusFor,
  holdsForApproval,
  revisionFrom,
} from "../../common/utils/approval";
import {
  contentSubject,
  NotificationsService,
  notifyTransition,
} from "../notifications/notifications.service";

const TAG = "events";

@Injectable()
export class EventsService {
  constructor(
    private readonly repo: EventsRepository,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly notifier: NotificationsService,
  ) {}

  private toPublic(doc: ChurchEventDocument): ChurchEvent {
    return serializeDoc<ChurchEvent>(doc, [...ADMIN_ONLY_FIELDS]);
  }

  private toAdmin(doc: ChurchEventDocument): WithSchedule<ChurchEvent> {
    return serializeDoc<WithSchedule<ChurchEvent>>(doc);
  }

  /**
   * F-003: a record cannot be *published* while its slug, title (either
   * language) still reads as placeholder text. Drafts are exempt.
   */
  private assertPublishable(record: {
    slug: string;
    title: { en?: string; ta?: string };
  }): void {
    assertNoPlaceholderContent({
      kind: "event",
      slug: record.slug,
      title: record.title,
    });
  }

  /* ------------------------------- Public API ------------------------------ */

  /**
   * GET /events — contract §5.1.
   * Default: newest first. `status=upcoming` (not yet over) sorts ascending,
   * `status=past` descending. Event timing status is derived from dates.
   */
  async listPublic(
    query: PaginationQueryDto,
    status?: EventStatus | "upcoming" | "past",
    fellowship?: FellowshipSlug,
    featured?: boolean,
  ): Promise<ChurchEvent[] | Paginated<ChurchEvent>> {
    const now = new Date();
    const filter: FilterQuery<ChurchEventEntity> = publiclyVisible<ChurchEventEntity>();
    let sort: Record<string, SortOrder> = { startDate: -1 };

    if (status === "upcoming") {
      // "Not past": the event's end (or start when no end) is still ahead.
      filter.$or = [
        { endDate: { $gte: now } },
        { endDate: null, startDate: { $gte: now } },
      ];
      sort = { startDate: 1 };
    } else if (status === "past") {
      filter.$or = [
        { endDate: { $lt: now } },
        { endDate: null, startDate: { $lt: now } },
      ];
    }

    if (fellowship) {
      filter.fellowshipSlug = fellowship;
      // Mirrors the Website mock: fellowship listings read chronologically.
      sort = { startDate: 1 };
    }
    if (featured) filter.featured = true;

    return resolveList(
      query,
      async (skip, limit) =>
        (await this.repo.find(filter, sort, skip, limit)).map((doc) =>
          this.toPublic(doc),
        ),
      () => this.repo.count(filter),
    );
  }

  /** GET /events/slugs — cheap, for generateStaticParams + sitemap. */
  async publicSlugs(): Promise<string[]> {
    const docs = await this.repo.find(publiclyVisible<ChurchEventEntity>(), { startDate: -1 });
    return docs.map((doc) => doc.slug);
  }

  /** GET /events/:slug — 404 when missing or unpublished. */
  async getPublicBySlug(slug: string): Promise<ChurchEvent> {
    const doc = await this.repo.findOne({ ...publiclyVisible<ChurchEventEntity>(), slug });
    if (!doc) throw new NotFoundException(`Event "${slug}" was not found`);
    return this.toPublic(doc);
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
  ): Promise<Paginated<WithSchedule<ChurchEvent>>> {
    const filter: FilterQuery<ChurchEventEntity> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { "title.en": containsInsensitive(search) },
        { "title.ta": containsInsensitive(search) },
        { slug: containsInsensitive(search) },
      ];
    }
    const [docs, total] = await Promise.all([
      this.repo.find(filter, { startDate: -1 }, (page - 1) * pageSize, pageSize),
      this.repo.count(filter),
    ]);
    return {
      items: docs.map((doc) => this.toAdmin(doc)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async getAdminById(id: string): Promise<WithSchedule<ChurchEvent>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateEventDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<ChurchEvent>> {
    assertMayWrite(actor, dto.status);
    const slug = await uniqueSlug(dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    // F-005: "…-2026" must not be stored as a 2027 date. Drafts included —
    // the date is what decides upcoming/past once it is published.
    assertSlugYearMatchesDate(slug, new Date(dto.startDate));
    if ((dto.status ?? "draft") === "published") {
      this.assertPublishable({ slug, title: dto.title });
    }
    const doc = await this.repo.create({
      // Remembered so the writer can be told what became of it.
      ...(canPublish(actor) ? {} : { submittedBy: { userId: actor.userId, name: actor.name } }),
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      publishAt: scheduleValue(dto.publishAt) ?? undefined,
      slug,
      status: dto.status ?? defaultStatusFor(actor, "draft"),
      featured: dto.featured ?? false,
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created event "${dto.title.en}"`);
    if (doc.status === "published") this.revalidate.trigger(TAG);
    if (doc.status === "pending") {
      await this.notifier.submitted(actor, contentSubject("events", doc.id, doc.title.en));
    }
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<ChurchEvent>> {
    const existing = await this.repo.findByIdOrThrow(id);
    // Approval rule: an editor's change to a live record is held for an
    // admin; the website keeps the current version until it is approved.
    if (holdsForApproval(actor, existing.status)) {
      const held = await this.repo.updateById(id, {
        $set: { revision: revisionFrom(dto, actor) },
      });
      await this.audit.log(
        actor,
        "update",
        TAG,
        id,
        `Submitted changes to event "${held.title.en}" for approval`,
      );
      await this.notifier.changesSubmitted(actor, contentSubject("events", id, held.title.en));
      return this.toAdmin(held);
    }
    assertMayWrite(actor, dto.status, existing.status);

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      if (existing.status !== "draft" && existing.status !== "pending") {
        throw new BadRequestException(
          "Slugs are immutable after publish — they are part of public URLs",
        );
      }
      slug = await uniqueSlug(slugify(dto.slug), (candidate) =>
        this.repo.exists({ slug: candidate, _id: { $ne: existing._id } }),
      );
    }

    assertSlugYearMatchesDate(
      slug,
      dto.startDate ? new Date(dto.startDate) : existing.startDate,
    );
    if ((dto.status ?? existing.status) === "published") {
      this.assertPublishable({
        slug,
        title: dto.title ?? existing.title,
      });
    }

    const doc = await this.repo.updateById(id, {
      // Saving by an approver (or an edit to a draft) settles any waiting change.
      $unset: { revision: 1 },
      ...(!canPublish(actor) && (dto.status ?? existing.status) === "pending"
        ? { submittedBy: { userId: actor.userId, name: actor.name } }
        : {}),
      ...dto,
      slug,
      ...(dto.publishAt !== undefined ? { publishAt: scheduleValue(dto.publishAt) } : {}),
      ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
      ...(dto.endDate !== undefined
        ? { endDate: dto.endDate ? new Date(dto.endDate) : undefined }
        : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated event "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(
      this.notifier,
      actor,
      canPublish(actor),
      existing,
      doc.status,
      contentSubject("events", id, doc.title.en),
    );
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<ChurchEvent>> {
    const before = await this.repo.findByIdOrThrow(id);
    if (status === "published") {
      this.assertPublishable(await this.repo.findByIdOrThrow(id));
    }
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} event "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(this.notifier, actor, true, before, status, contentSubject("events", id, doc.title.en));
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const current = await this.repo.findByIdOrThrow(id);
    assertMayDelete(actor, current.status);
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted event "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
  }

  /** Discards a change waiting for approval; the live record is untouched. */
  async rejectRevision(id: string, actor: AuthenticatedUser) {
    const existing = await this.repo.findByIdOrThrow(id);
    if (!existing.revision) {
      throw new NotFoundException("There is no change waiting for approval");
    }
    const who = existing.revision.submittedBy.name;
    const doc = await this.repo.updateById(id, { $unset: { revision: 1 } });
    await this.audit.log(
      actor,
      "update",
      TAG,
      id,
      `Rejected ${who}'s changes to event "${doc.title.en}"`,
    );
    await this.notifier.rejected(
      actor,
      existing.revision.submittedBy,
      contentSubject("events", id, doc.title.en),
      true,
    );
    return this.toAdmin(doc);
  }
}
