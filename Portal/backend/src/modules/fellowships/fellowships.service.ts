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

const TAG = "fellowships";

export class FellowshipsRepository extends BaseRepository<FellowshipEntity> {}

@Injectable()
export class FellowshipsService {
  private readonly repo: FellowshipsRepository;

  constructor(
    @InjectModel(FellowshipEntity.name) model: Model<FellowshipEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {
    this.repo = new FellowshipsRepository(model);
  }

  private toPublic(doc: FellowshipDocument): Fellowship {
    return serializeDoc<Fellowship>(doc, ["status"]);
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

  /** GET /fellowships — sorted by `order` (contract §5.6). */
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
    if (await this.repo.exists({ slug: dto.slug })) {
      throw new ConflictException(`Fellowship "${dto.slug}" already exists`);
    }
    const doc = await this.repo.create({
      ...dto,
      committee: this.withMemberIds(dto.committee) ?? [],
      status: dto.status ?? "published",
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created fellowship "${dto.name.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateFellowshipDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<Fellowship>> {
    const doc = await this.repo.updateById(id, {
      ...dto,
      ...(dto.committee ? { committee: this.withMemberIds(dto.committee) } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated fellowship "${doc.name.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<Fellowship>> {
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} fellowship "${doc.name.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted fellowship "${doc.name.en}"`);
    this.revalidate.trigger(TAG);
  }
}
