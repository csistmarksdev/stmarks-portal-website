import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  DownloadCategory,
  DownloadFile,
  DownloadsGrouped,
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
import { slugify, uniqueSlug } from "../../common/utils/slugify";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { CreateDownloadDto, UpdateDownloadDto } from "./dto/download.dto";
import { DownloadEntity, type DownloadDocument } from "./schemas/download.schema";

const TAG = "downloads";

export class DownloadsRepository extends BaseRepository<DownloadEntity> {}

@Injectable()
export class DownloadsService {
  private readonly repo: DownloadsRepository;

  constructor(
    @InjectModel(DownloadEntity.name) model: Model<DownloadEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {
    this.repo = new DownloadsRepository(model);
  }

  private toPublic(doc: DownloadDocument): DownloadFile {
    return serializeDoc<DownloadFile>(doc, ["status"]);
  }

  private toAdmin(doc: DownloadDocument): WithStatus<DownloadFile> {
    return serializeDoc<WithStatus<DownloadFile>>(doc);
  }

  /* ------------------------------- Public API ------------------------------ */

  /** GET /downloads — newest first (contract §5.5). */
  listPublic(
    query: PaginationQueryDto,
    category?: DownloadCategory,
    fellowship?: FellowshipSlug,
  ): Promise<DownloadFile[] | Paginated<DownloadFile>> {
    const filter: FilterQuery<DownloadEntity> = { status: "published" };
    if (category) filter.category = category;
    if (fellowship) filter.fellowshipSlug = fellowship;

    return resolveList(
      query,
      async (skip, limit) =>
        (await this.repo.find(filter, { publishedAt: -1 }, skip, limit)).map(
          (doc) => this.toPublic(doc),
        ),
      () => this.repo.count(filter),
    );
  }

  /** GET /downloads/grouped — one call for the downloads page. */
  async grouped(): Promise<DownloadsGrouped> {
    const docs = await this.repo.find({ status: "published" }, { publishedAt: -1 });
    const all = docs.map((doc) => this.toPublic(doc));
    return {
      bulletin: all.filter((file) => file.category === "bulletin"),
      form: all.filter((file) => file.category === "form"),
      document: all.filter((file) => file.category === "document"),
    };
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
    category?: DownloadCategory,
  ): Promise<Paginated<WithStatus<DownloadFile>>> {
    const filter: FilterQuery<DownloadEntity> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { "title.en": { $regex: search, $options: "i" } },
        { "title.ta": { $regex: search, $options: "i" } },
      ];
    }
    const [docs, total] = await Promise.all([
      this.repo.find(filter, { publishedAt: -1 }, (page - 1) * pageSize, pageSize),
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

  async getAdminById(id: string): Promise<WithStatus<DownloadFile>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateDownloadDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<DownloadFile>> {
    const slug = await uniqueSlug(dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    const doc = await this.repo.create({
      ...dto,
      publishedAt: new Date(dto.publishedAt),
      slug,
      status: dto.status ?? "draft",
      format: dto.format.toUpperCase(),
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created download "${dto.title.en}"`);
    if (doc.status === "published") this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateDownloadDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<DownloadFile>> {
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

    const doc = await this.repo.updateById(id, {
      ...dto,
      slug,
      ...(dto.publishedAt ? { publishedAt: new Date(dto.publishedAt) } : {}),
      ...(dto.format ? { format: dto.format.toUpperCase() } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated download "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<DownloadFile>> {
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} download "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted download "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
  }
}
