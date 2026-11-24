import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  BlogPost,
  FellowshipSlug,
  Paginated,
  PublishStatus,
  WithSchedule,
} from "@portal/shared";
import { ADMIN_ONLY_FIELDS } from "@portal/shared";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";

import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { BaseRepository } from "../../common/repositories/base.repository";
import { readingMinutes } from "../../common/utils/format";
import { resolveList } from "../../common/utils/pagination";
import { serializeDoc } from "../../common/utils/serialize";
import { containsInsensitive } from "../../common/utils/mongo";
import { slugify, uniqueSlug } from "../../common/utils/slugify";
import { cleanSeo } from "../../common/utils/seo";
import { assertNoPlaceholderContent } from "../../common/utils/content-guards";
import { publiclyVisible, scheduleValue } from "../../common/utils/publication";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { CreateBlogPostDto, UpdateBlogPostDto } from "./dto/create-blog-post.dto";
import { BlogPostEntity, type BlogPostDocument } from "./schemas/blog-post.schema";
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

const TAG = "blog";

export class BlogRepository extends BaseRepository<BlogPostEntity> {}

@Injectable()
export class BlogService {
  private readonly repo: BlogRepository;

  constructor(
    @InjectModel(BlogPostEntity.name) model: Model<BlogPostEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly notifier: NotificationsService,
  ) {
    this.repo = new BlogRepository(model);
  }

  private toPublic(doc: BlogPostDocument): BlogPost {
    return serializeDoc<BlogPost>(doc, [...ADMIN_ONLY_FIELDS]);
  }

  private toAdmin(doc: BlogPostDocument): WithSchedule<BlogPost> {
    return serializeDoc<WithSchedule<BlogPost>>(doc);
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
      kind: "blog post",
      slug: record.slug,
      title: record.title,
    });
  }

  /* ------------------------------- Public API ------------------------------ */

  /** GET /blog - newest first by publishedAt (contract §5.2). */
  listPublic(
    query: PaginationQueryDto,
    eventSlug?: string,
    fellowship?: FellowshipSlug,
  ): Promise<BlogPost[] | Paginated<BlogPost>> {
    const filter: FilterQuery<BlogPostEntity> = publiclyVisible<BlogPostEntity>();
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
    const docs = await this.repo.find(publiclyVisible<BlogPostEntity>(), { publishedAt: -1 });
    return docs.map((doc) => doc.slug);
  }

  async getPublicBySlug(slug: string): Promise<BlogPost> {
    const doc = await this.repo.findOne({ ...publiclyVisible<BlogPostEntity>(), slug });
    if (!doc) throw new NotFoundException(`Blog post "${slug}" was not found`);
    return this.toPublic(doc);
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
  ): Promise<Paginated<WithSchedule<BlogPost>>> {
    const filter: FilterQuery<BlogPostEntity> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { "title.en": containsInsensitive(search) },
        { "title.ta": containsInsensitive(search) },
        { slug: containsInsensitive(search) },
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

  async getAdminById(id: string): Promise<WithSchedule<BlogPost>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateBlogPostDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<BlogPost>> {
    if (dto.seo !== undefined) dto.seo = cleanSeo(dto.seo);
    assertMayWrite(actor, dto.status);
    // A slug typed in the form wins; otherwise it comes from the English title.
    const slug = await uniqueSlug(dto.slug?.trim() || dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    if ((dto.status ?? "draft") === "published") {
      this.assertPublishable({ slug, title: dto.title });
    }
    const doc = await this.repo.create({
      // Remembered so the writer can be told what became of it.
      ...(canPublish(actor) ? {} : { submittedBy: { userId: actor.userId, name: actor.name } }),
      ...dto,
      publishedAt: new Date(dto.publishedAt),
      publishAt: scheduleValue(dto.publishAt) ?? undefined,
      slug,
      status: dto.status ?? defaultStatusFor(actor, "draft"),
      readingMinutes: readingMinutes(dto.body),
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created blog post "${dto.title.en}"`);
    if (doc.status === "published") this.revalidate.trigger(TAG);
    if (doc.status === "pending") {
      await this.notifier.submitted(actor, contentSubject("blog", doc.id, doc.title.en));
    }
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateBlogPostDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<BlogPost>> {
    if (dto.seo !== undefined) dto.seo = cleanSeo(dto.seo);
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
        `Submitted changes to blog post "${held.title.en}" for approval`,
      );
      await this.notifier.changesSubmitted(actor, contentSubject("blog", id, held.title.en));
      return this.toAdmin(held);
    }
    assertMayWrite(actor, dto.status, existing.status);

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      if (existing.status !== "draft" && existing.status !== "pending") {
        throw new BadRequestException(
          "Slugs are immutable after publish, because they are part of public URLs",
        );
      }
      slug = await uniqueSlug(slugify(dto.slug), (candidate) =>
        this.repo.exists({ slug: candidate, _id: { $ne: existing._id } }),
      );
    }

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
      ...(dto.publishedAt ? { publishedAt: new Date(dto.publishedAt) } : {}),
      ...(dto.body ? { readingMinutes: readingMinutes(dto.body) } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated blog post "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(
      this.notifier,
      actor,
      canPublish(actor),
      existing,
      doc.status,
      contentSubject("blog", id, doc.title.en),
    );
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<BlogPost>> {
    const before = await this.repo.findByIdOrThrow(id);
    if (status === "published") {
      this.assertPublishable(await this.repo.findByIdOrThrow(id));
    }
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} blog post "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(this.notifier, actor, true, before, status, contentSubject("blog", id, doc.title.en));
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const current = await this.repo.findByIdOrThrow(id);
    assertMayDelete(actor, current.status);
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted blog post "${doc.title.en}"`);
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
      `Rejected ${who}'s changes to blog post "${doc.title.en}"`,
    );
    await this.notifier.rejected(
      actor,
      existing.revision.submittedBy,
      contentSubject("blog", id, doc.title.en),
      true,
    );
    return this.toAdmin(doc);
  }
}
