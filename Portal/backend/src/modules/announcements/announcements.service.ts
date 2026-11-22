import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  Announcement,
  FellowshipSlug,
  Paginated,
  PublishStatus,
  WithSchedule,
} from "@portal/shared";
import { ADMIN_ONLY_FIELDS } from "@portal/shared";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";

import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { BaseRepository } from "../../common/repositories/base.repository";
import { resolveList } from "../../common/utils/pagination";
import { serializeDoc } from "../../common/utils/serialize";
import { containsInsensitive } from "../../common/utils/mongo";
import { slugify, uniqueSlug } from "../../common/utils/slugify";
import { assertNoPlaceholderContent } from "../../common/utils/content-guards";
import {
  assertScheduleOrder,
  publiclyVisible,
  scheduleValue,
} from "../../common/utils/publication";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "./dto/announcement.dto";
import {
  AnnouncementEntity,
  type AnnouncementDocument,
} from "./schemas/announcement.schema";
import { assertMayPin, assertMayWrite, defaultStatusFor } from "../../common/utils/approval";

const TAG = "announcements";

/** Contract §5.4 — pinned first, then newest. */
const PINNED_THEN_NEWEST = { pinned: -1 as const, publishedAt: -1 as const };

export class AnnouncementsRepository extends BaseRepository<AnnouncementEntity> {}

@Injectable()
export class AnnouncementsService {
  private readonly repo: AnnouncementsRepository;

  constructor(
    @InjectModel(AnnouncementEntity.name) model: Model<AnnouncementEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {
    this.repo = new AnnouncementsRepository(model);
  }

  private toPublic(doc: AnnouncementDocument): Announcement {
    return serializeDoc<Announcement>(doc, [...ADMIN_ONLY_FIELDS]);
  }

  private toAdmin(doc: AnnouncementDocument): WithSchedule<Announcement> {
    return serializeDoc<WithSchedule<Announcement>>(doc);
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
      kind: "announcement",
      slug: record.slug,
      title: record.title,
    });
  }

  /* ------------------------------- Public API ------------------------------ */

  listPublic(
    query: PaginationQueryDto,
    fellowship?: FellowshipSlug,
  ): Promise<Announcement[] | Paginated<Announcement>> {
    // F-049: published, past its publishAt and not yet expired.
    const filter: FilterQuery<AnnouncementEntity> = publiclyVisible({ expiry: true });
    if (fellowship) filter.fellowshipSlug = fellowship;

    return resolveList(
      query,
      async (skip, limit) =>
        (await this.repo.find(filter, PINNED_THEN_NEWEST, skip, limit)).map(
          (doc) => this.toPublic(doc),
        ),
      () => this.repo.count(filter),
    );
  }

  /** GET /announcements/pinned → Announcement | null (JSON null body). */
  async getPinned(): Promise<Announcement | null> {
    const doc = await this.repo.findOne({
      ...publiclyVisible<AnnouncementEntity>({ expiry: true }),
      pinned: true,
    });
    return doc ? this.toPublic(doc) : null;
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
  ): Promise<Paginated<WithSchedule<Announcement>>> {
    const filter: FilterQuery<AnnouncementEntity> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { "title.en": containsInsensitive(search) },
        { "title.ta": containsInsensitive(search) },
      ];
    }
    const [docs, total] = await Promise.all([
      this.repo.find(filter, PINNED_THEN_NEWEST, (page - 1) * pageSize, pageSize),
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

  async getAdminById(id: string): Promise<WithSchedule<Announcement>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateAnnouncementDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<Announcement>> {
    assertMayWrite(actor, dto.status);
    const slug = await uniqueSlug(dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    const publishAt = scheduleValue(dto.publishAt);
    const expiresAt = scheduleValue(dto.expiresAt);
    assertScheduleOrder(publishAt, expiresAt);
    assertMayPin(actor, dto.pinned || undefined);
    if (dto.pinned) await this.unpinAll();
    if ((dto.status ?? "draft") === "published") {
      this.assertPublishable({ slug, title: dto.title });
    }
    const doc = await this.repo.create({
      ...dto,
      publishAt: publishAt ?? undefined,
      expiresAt: expiresAt ?? undefined,
      publishedAt: new Date(dto.publishedAt),
      slug,
      status: dto.status ?? defaultStatusFor(actor, "draft"),
      pinned: dto.pinned ?? false,
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created announcement "${dto.title.en}"`);
    if (doc.status === "published") this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateAnnouncementDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<Announcement>> {
    const existing = await this.repo.findByIdOrThrow(id);
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

    const publishAt = scheduleValue(dto.publishAt);
    const expiresAt = scheduleValue(dto.expiresAt);
    assertScheduleOrder(
      publishAt === undefined ? existing.publishAt : publishAt,
      expiresAt === undefined ? existing.expiresAt : expiresAt,
    );

    if (dto.pinned !== undefined && Boolean(dto.pinned) !== Boolean(existing.pinned)) {
      assertMayPin(actor, dto.pinned);
    }
    if (dto.pinned) await this.unpinAll(id);
    if ((dto.status ?? existing.status) === "published") {
      this.assertPublishable({
        slug,
        title: dto.title ?? existing.title,
      });
    }

    const doc = await this.repo.updateById(id, {
      ...dto,
      ...(publishAt !== undefined ? { publishAt } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      slug,
      ...(dto.publishedAt ? { publishedAt: new Date(dto.publishedAt) } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated announcement "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  /** Pin toggle — pinning one announcement unpins every other (§7). */
  async setPinned(
    id: string,
    pinned: boolean,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<Announcement>> {
    if (pinned) await this.unpinAll(id);
    const doc = await this.repo.updateById(id, { pinned });
    await this.audit.log(
      actor,
      "pin",
      TAG,
      id,
      `${pinned ? "Pinned" : "Unpinned"} announcement "${doc.title.en}"`,
    );
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<Announcement>> {
    if (status === "published") {
      this.assertPublishable(await this.repo.findByIdOrThrow(id));
    }
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} announcement "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted announcement "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
  }

  private async unpinAll(exceptId?: string): Promise<void> {
    const filter: FilterQuery<AnnouncementEntity> = { pinned: true };
    if (exceptId) filter._id = { $ne: exceptId };
    await this.repo.updateMany(filter, { pinned: false });
  }
}
