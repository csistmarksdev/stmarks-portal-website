import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  Announcement,
  FellowshipSlug,
  Paginated,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";

import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { BaseRepository } from "../../common/repositories/base.repository";
import { resolveList } from "../../common/utils/pagination";
import { serializeDoc } from "../../common/utils/serialize";
import { containsInsensitive } from "../../common/utils/mongo";
import { slugify, uniqueSlug } from "../../common/utils/slugify";
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
    return serializeDoc<Announcement>(doc, ["status"]);
  }

  private toAdmin(doc: AnnouncementDocument): WithStatus<Announcement> {
    return serializeDoc<WithStatus<Announcement>>(doc);
  }

  /* ------------------------------- Public API ------------------------------ */

  listPublic(
    query: PaginationQueryDto,
    fellowship?: FellowshipSlug,
  ): Promise<Announcement[] | Paginated<Announcement>> {
    const filter: FilterQuery<AnnouncementEntity> = { status: "published" };
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
    const doc = await this.repo.findOne({ status: "published", pinned: true });
    return doc ? this.toPublic(doc) : null;
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
  ): Promise<Paginated<WithStatus<Announcement>>> {
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

  async getAdminById(id: string): Promise<WithStatus<Announcement>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateAnnouncementDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<Announcement>> {
    const slug = await uniqueSlug(dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    if (dto.pinned) await this.unpinAll();
    const doc = await this.repo.create({
      ...dto,
      publishedAt: new Date(dto.publishedAt),
      slug,
      status: dto.status ?? "draft",
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
  ): Promise<WithStatus<Announcement>> {
    const existing = await this.repo.findByIdOrThrow(id);

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      if (existing.status !== "draft") {
        throw new BadRequestException(
          "Slugs are immutable after publish — they are part of public URLs",
        );
      }
      slug = await uniqueSlug(slugify(dto.slug), (candidate) =>
        this.repo.exists({ slug: candidate, _id: { $ne: existing._id } }),
      );
    }

    if (dto.pinned) await this.unpinAll(id);
    const doc = await this.repo.updateById(id, {
      ...dto,
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
  ): Promise<WithStatus<Announcement>> {
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
  ): Promise<WithStatus<Announcement>> {
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
