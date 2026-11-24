import { ADMIN_ONLY_FIELDS } from "@portal/shared";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
import { containsInsensitive } from "../../common/utils/mongo";
import { slugify, uniqueSlug } from "../../common/utils/slugify";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import { CreateDownloadDto, UpdateDownloadDto } from "./dto/download.dto";
import { DownloadEntity, type DownloadDocument } from "./schemas/download.schema";
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

const TAG = "downloads";

export class DownloadsRepository extends BaseRepository<DownloadEntity> {}

@Injectable()
export class DownloadsService {
  private readonly repo: DownloadsRepository;

  constructor(
    @InjectModel(DownloadEntity.name) model: Model<DownloadEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly notifier: NotificationsService,
  ) {
    this.repo = new DownloadsRepository(model);
  }

  private toPublic(doc: DownloadDocument): DownloadFile {
    return serializeDoc<DownloadFile>(doc, [...ADMIN_ONLY_FIELDS]);
  }

  private toAdmin(doc: DownloadDocument): WithStatus<DownloadFile> {
    return serializeDoc<WithStatus<DownloadFile>>(doc);
  }

  /* ------------------------------- Public API ------------------------------ */

  /** GET /downloads - newest first (contract §5.5). */
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

  /** GET /downloads/grouped - one call for the downloads page. */
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
        { "title.en": containsInsensitive(search) },
        { "title.ta": containsInsensitive(search) },
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
    assertMayWrite(actor, dto.status);
    // A slug typed in the form wins; otherwise it comes from the English title.
    const slug = await uniqueSlug(dto.slug?.trim() || dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    const doc = await this.repo.create({
      // Remembered so the writer can be told what became of it.
      ...(canPublish(actor) ? {} : { submittedBy: { userId: actor.userId, name: actor.name } }),
      ...dto,
      publishedAt: new Date(dto.publishedAt),
      slug,
      status: dto.status ?? defaultStatusFor(actor, "draft"),
      format: dto.format.toUpperCase(),
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created download "${dto.title.en}"`);
    if (doc.status === "published") this.revalidate.trigger(TAG);
    if (doc.status === "pending") {
      await this.notifier.submitted(actor, contentSubject("downloads", doc.id, doc.title.en));
    }
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateDownloadDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<DownloadFile>> {
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
        `Submitted changes to download "${held.title.en}" for approval`,
      );
      await this.notifier.changesSubmitted(actor, contentSubject("downloads", id, held.title.en));
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

    const doc = await this.repo.updateById(id, {
      // Saving by an approver (or an edit to a draft) settles any waiting change.
      $unset: { revision: 1 },
      ...(!canPublish(actor) && (dto.status ?? existing.status) === "pending"
        ? { submittedBy: { userId: actor.userId, name: actor.name } }
        : {}),
      ...dto,
      slug,
      ...(dto.publishedAt ? { publishedAt: new Date(dto.publishedAt) } : {}),
      ...(dto.format ? { format: dto.format.toUpperCase() } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated download "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(
      this.notifier,
      actor,
      canPublish(actor),
      existing,
      doc.status,
      contentSubject("downloads", id, doc.title.en),
    );
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<DownloadFile>> {
    const before = await this.repo.findByIdOrThrow(id);
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} download "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(this.notifier, actor, true, before, status, contentSubject("downloads", id, doc.title.en));
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const current = await this.repo.findByIdOrThrow(id);
    assertMayDelete(actor, current.status);
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted download "${doc.title.en}"`);
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
      `Rejected ${who}'s changes to download "${doc.title.en}"`,
    );
    await this.notifier.rejected(
      actor,
      existing.revision.submittedBy,
      contentSubject("downloads", id, doc.title.en),
      true,
    );
    return this.toAdmin(doc);
  }
}
