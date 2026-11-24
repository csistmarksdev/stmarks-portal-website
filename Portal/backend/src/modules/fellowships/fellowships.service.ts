import { ADMIN_ONLY_FIELDS } from "@portal/shared";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  Fellowship,
  FellowshipSlug,
  Paginated,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { randomUUID } from "node:crypto";
import { Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { BaseRepository } from "../../common/repositories/base.repository";
import { serializeDoc } from "../../common/utils/serialize";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import {
  CommitteeMemberDto,
  CreateFellowshipDto,
  UpdateFellowshipDto,
} from "./dto/fellowship.dto";
import {
  FellowshipEntity,
  type FellowshipDocument,
} from "./schemas/fellowship.schema";
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

const TAG = "fellowships";

export class FellowshipsRepository extends BaseRepository<FellowshipEntity> {}

@Injectable()
export class FellowshipsService {
  private readonly repo: FellowshipsRepository;

  constructor(
    @InjectModel(FellowshipEntity.name) model: Model<FellowshipEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly notifier: NotificationsService,
  ) {
    this.repo = new FellowshipsRepository(model);
  }

  private toPublic(doc: FellowshipDocument): Fellowship {
    return serializeDoc<Fellowship>(doc, [...ADMIN_ONLY_FIELDS]);
  }

  private toAdmin(doc: FellowshipDocument): WithStatus<Fellowship> {
    return serializeDoc<WithStatus<Fellowship>>(doc);
  }

  private withMemberIds(committee?: CommitteeMemberDto[]) {
    return committee?.map((member) => ({
      ...member,
      id: member.id ?? randomUUID(),
    }));
  }

  /* ------------------------------- Public API ------------------------------ */

  /** GET /fellowships - sorted by `order` (contract §5.6). */
  async listPublic(): Promise<Fellowship[]> {
    const docs = await this.repo.find({ status: "published" }, { order: 1 });
    return docs.map((doc) => this.toPublic(doc));
  }

  async publicSlugs(): Promise<FellowshipSlug[]> {
    const docs = await this.repo.find({ status: "published" }, { order: 1 });
    return docs.map((doc) => doc.slug);
  }

  async getPublicBySlug(slug: string): Promise<Fellowship> {
    const doc = await this.repo.findOne({ slug, status: "published" });
    if (!doc) throw new NotFoundException(`Fellowship "${slug}" was not found`);
    return this.toPublic(doc);
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(): Promise<Paginated<WithStatus<Fellowship>>> {
    const docs = await this.repo.find({}, { order: 1 });
    return {
      items: docs.map((doc) => this.toAdmin(doc)),
      total: docs.length,
      page: 1,
      pageSize: Math.max(docs.length, 1),
      hasMore: false,
    };
  }

  async getAdminById(id: string): Promise<WithStatus<Fellowship>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateFellowshipDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<Fellowship>> {
    assertMayWrite(actor, dto.status);
    if (await this.repo.exists({ slug: dto.slug })) {
      throw new ConflictException(`Fellowship "${dto.slug}" already exists`);
    }
    const doc = await this.repo.create({
      // Remembered so the writer can be told what became of it.
      ...(canPublish(actor) ? {} : { submittedBy: { userId: actor.userId, name: actor.name } }),
      ...dto,
      committee: this.withMemberIds(dto.committee) ?? [],
      status: dto.status ?? defaultStatusFor(actor, "published"),
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created fellowship "${dto.name.en}"`);
    this.revalidate.trigger(TAG);
    if (doc.status === "pending") {
      await this.notifier.submitted(actor, contentSubject("fellowships", doc.id, doc.name.en));
    }
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateFellowshipDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<Fellowship>> {
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
        `Submitted changes to fellowship "${held.name.en}" for approval`,
      );
      await this.notifier.changesSubmitted(actor, contentSubject("fellowships", id, held.name.en));
      return this.toAdmin(held);
    }
    assertMayWrite(actor, dto.status, existing.status);
    const doc = await this.repo.updateById(id, {
      // Saving by an approver (or an edit to a draft) settles any waiting change.
      $unset: { revision: 1 },
      ...(!canPublish(actor) && (dto.status ?? existing.status) === "pending"
        ? { submittedBy: { userId: actor.userId, name: actor.name } }
        : {}),
      ...dto,
      ...(dto.committee ? { committee: this.withMemberIds(dto.committee) } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated fellowship "${doc.name.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(
      this.notifier,
      actor,
      canPublish(actor),
      existing,
      doc.status,
      contentSubject("fellowships", id, doc.name.en),
    );
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<Fellowship>> {
    const before = await this.repo.findByIdOrThrow(id);
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} fellowship "${doc.name.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(this.notifier, actor, true, before, status, contentSubject("fellowships", id, doc.name.en));
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const current = await this.repo.findByIdOrThrow(id);
    assertMayDelete(actor, current.status);
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted fellowship "${doc.name.en}"`);
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
      `Rejected ${who}'s changes to fellowship "${doc.name.en}"`,
    );
    await this.notifier.rejected(
      actor,
      existing.revision.submittedBy,
      contentSubject("fellowships", id, doc.name.en),
      true,
    );
    return this.toAdmin(doc);
  }
}
