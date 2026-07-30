import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  FellowshipSlug,
  GalleryAlbum,
  Paginated,
  PublishStatus,
  WithStatus,
} from "@portal/shared";
import { randomUUID } from "node:crypto";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";

import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { BaseRepository } from "../../common/repositories/base.repository";
import { resolveList } from "../../common/utils/pagination";
import { serializeDoc } from "../../common/utils/serialize";
import { slugify, uniqueSlug } from "../../common/utils/slugify";
import {
  describeVideoProblem,
  inferVideoProvider,
} from "../../common/utils/video";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import {
  AddPhotosDto,
  CreateAlbumDto,
  ReorderPhotosDto,
  UpdateAlbumDto,
} from "./dto/gallery.dto";
import {
  GalleryAlbumEntity,
  type GalleryAlbumDocument,
} from "./schemas/gallery-album.schema";

const TAG = "gallery";

export class GalleryRepository extends BaseRepository<GalleryAlbumEntity> {}

@Injectable()
export class GalleryService {
  private readonly repo: GalleryRepository;

  constructor(
    @InjectModel(GalleryAlbumEntity.name) model: Model<GalleryAlbumEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {
    this.repo = new GalleryRepository(model);
  }

  private toPublic(doc: GalleryAlbumDocument): GalleryAlbum {
    return serializeDoc<GalleryAlbum>(doc, ["status"]);
  }

  private toAdmin(doc: GalleryAlbumDocument): WithStatus<GalleryAlbum> {
    return serializeDoc<WithStatus<GalleryAlbum>>(doc);
  }

  /* ------------------------------- Public API ------------------------------ */

  /** GET /gallery — newest first by album `date` (contract §5.3). */
  listPublic(
    query: PaginationQueryDto,
    fellowship?: FellowshipSlug,
  ): Promise<GalleryAlbum[] | Paginated<GalleryAlbum>> {
    const filter: FilterQuery<GalleryAlbumEntity> = { status: "published" };
    if (fellowship) {
      // A fellowship's gallery holds its own event albums *plus* any shared,
      // churchwide albums the admin has marked as common (contract §5.3).
      filter.$or = [{ fellowshipSlug: fellowship }, { shared: true }];
    }

    return resolveList(
      query,
      async (skip, limit) =>
        (await this.repo.find(filter, { date: -1 }, skip, limit)).map((doc) =>
          this.toPublic(doc),
        ),
      () => this.repo.count(filter),
    );
  }

  async publicSlugs(): Promise<string[]> {
    const docs = await this.repo.find({ status: "published" }, { date: -1 });
    return docs.map((doc) => doc.slug);
  }

  async getPublicBySlug(slug: string): Promise<GalleryAlbum> {
    const doc = await this.repo.findOne({ slug, status: "published" });
    if (!doc) throw new NotFoundException(`Album "${slug}" was not found`);
    return this.toPublic(doc);
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
  ): Promise<Paginated<WithStatus<GalleryAlbum>>> {
    const filter: FilterQuery<GalleryAlbumEntity> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { "title.en": { $regex: search, $options: "i" } },
        { "title.ta": { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }
    const [docs, total] = await Promise.all([
      this.repo.find(filter, { date: -1 }, (page - 1) * pageSize, pageSize),
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

  async getAdminById(id: string): Promise<WithStatus<GalleryAlbum>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateAlbumDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<GalleryAlbum>> {
    const slug = await uniqueSlug(dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    const doc = await this.repo.create({
      ...dto,
      date: new Date(dto.date),
      slug,
      status: dto.status ?? "draft",
      photos: [],
    });
    await this.audit.log(actor, "create", TAG, doc.id, `Created album "${dto.title.en}"`);
    if (doc.status === "published") this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateAlbumDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<GalleryAlbum>> {
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
      ...(dto.date ? { date: new Date(dto.date) } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated album "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<GalleryAlbum>> {
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} album "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted album "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
  }

  /* ----------------------------- Photo handling ---------------------------- */

  async addPhotos(
    id: string,
    dto: AddPhotosDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<GalleryAlbum>> {
    const additions = dto.photos.map((photo) => {
      if (!photo.video) {
        return { id: randomUUID(), image: photo.image, caption: photo.caption };
      }
      const provider = photo.video.provider ?? inferVideoProvider(photo.video.url);
      // Caught here rather than on the live site, where an unparseable link
      // renders an empty player with no clue as to why.
      const problem = describeVideoProblem(photo.video.url, provider);
      if (problem) throw new BadRequestException(problem);

      return {
        id: randomUUID(),
        image: photo.image,
        caption: photo.caption,
        // Stored rather than left to the client to work out, so every
        // consumer sees the same value.
        video: { url: photo.video.url, provider },
      };
    });
    const doc = await this.repo.updateById(id, {
      $push: { photos: { $each: additions } },
    });
    await this.audit.log(
      actor,
      "update",
      TAG,
      id,
      `Added ${additions.length} photo(s) to album "${doc.title.en}"`,
    );
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async removePhoto(
    id: string,
    photoId: string,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<GalleryAlbum>> {
    const doc = await this.repo.updateById(id, {
      $pull: { photos: { id: photoId } },
    });
    await this.audit.log(actor, "update", TAG, id, `Removed a photo from album "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(doc);
  }

  async reorderPhotos(
    id: string,
    dto: ReorderPhotosDto,
    actor: AuthenticatedUser,
  ): Promise<WithStatus<GalleryAlbum>> {
    const existing = await this.repo.findByIdOrThrow(id);
    const byId = new Map(existing.photos.map((photo) => [photo.id, photo]));
    if (
      dto.photoIds.length !== existing.photos.length ||
      dto.photoIds.some((photoId) => !byId.has(photoId))
    ) {
      throw new BadRequestException(
        "photoIds must be a permutation of the album's current photo ids",
      );
    }
    existing.photos = dto.photoIds.map((photoId) => byId.get(photoId)!);
    await existing.save();
    await this.audit.log(actor, "update", TAG, id, `Reordered photos in album "${existing.title.en}"`);
    this.revalidate.trigger(TAG);
    return this.toAdmin(existing);
  }
}
