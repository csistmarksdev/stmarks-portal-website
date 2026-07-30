import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  BlogPost,
  FellowshipSlug,
  Paginated,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";

import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { BaseRepository } from "../../common/repositories/base.repository";
import { readingMinutes } from "../../common/utils/format";
import { resolveList } from "../../common/utils/pagination";
import { serializeDoc } from "../../common/utils/serialize";
import { slugify, uniqueSlug } from "../../common/utils/slugify";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { CreateBlogPostDto, UpdateBlogPostDto } from "./dto/create-blog-post.dto";
import { BlogPostEntity, type BlogPostDocument } from "./schemas/blog-post.schema";

const TAG = "blog";

export class BlogRepository extends BaseRepository<BlogPostEntity> {}

@Injectable()
export class BlogService {
  private readonly repo: BlogRepository;

  constructor(
    @InjectModel(BlogPostEntity.name) model: Model<BlogPostEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {
    this.repo = new BlogRepository(model);
  }

  private toPublic(doc: BlogPostDocument): BlogPost {
    return serializeDoc<BlogPost>(doc, ["status"]);
  }

  private toAdmin(doc: BlogPostDocument): WithStatus<BlogPost> {
    return serializeDoc<WithStatus<BlogPost>>(doc);
  }

  /* ------------------------------- Public API ------------------------------ */

  /** GET /blog — newest first by publishedAt (contract §5.2). */
  listPublic(
    query: PaginationQueryDto,
    eventSlug?: string,
    fellowship?: FellowshipSlug,
  ): Promise<BlogPost[] | Paginated<BlogPost>> {
    const filter: FilterQuery<BlogPostEntity> = { status: "published" };
    if (eventSlug) filter.eventSlug = eventSlug;
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

  async publicSlugs(): Promise<string[]> {
    const docs = await this.repo.find({ status: "published" }, { publishedAt: -1 });
    return docs.map((doc) => doc.slug);
  }

  async getPublicBySlug(slug: string): Promise<BlogPost> {
    const doc = await this.repo.findOne({ slug, status: "published" });
    if (!doc) throw new NotFoundException(`Blog post "${slug}" was not found`);
    return this.toPublic(doc);
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
  ): Promise<Paginated<WithStatus<BlogPost>>> {
    const filter: FilterQuery<BlogPostEntity> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { "title.en": { $regex: search, $options: "i" } },
        { "title.ta": { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
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

  async getAdminById(id: string): Promise<WithStatus<BlogPost>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateBlogPostDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<BlogPost>> {
    const slug = await uniqueSlug(dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    const doc = await this.repo.create({
      ...dto,
      publishedAt: new Date(dto.publishedAt),
      slug,
      status: dto.status ?? "draft",
      readingMinutes: readingMinutes(dto.body),
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created blog post "${dto.title.en}"`);
    if (doc.status === "published") this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateBlogPostDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<BlogPost>> {
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
      ...(dto.body ? { readingMinutes: readingMinutes(dto.body) } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated blog post "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<BlogPost>> {
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} blog post "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted blog post "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
  }
}
