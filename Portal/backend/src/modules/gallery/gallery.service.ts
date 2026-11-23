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
  WithSchedule,
} from "@portal/shared";
import { ADMIN_ONLY_FIELDS } from "@portal/shared";
import { randomUUID } from "node:crypto";
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
import { publiclyVisible, scheduleValue } from "../../common/utils/publication";
import {
  describeVideoProblem,
  inferVideoProvider,
} from "../../common/utils/video";
import { AuditService } from "../audit/audit.service";
import { RevalidateService } from "../revalidate/revalidate.service";
import {
  AddPhotoDto,
  AddPhotosDto,
  CreateAlbumDto,
  ReorderPhotosDto,
  UpdateAlbumDto,
} from "./dto/gallery.dto";
import {
  GalleryAlbumEntity,
  type GalleryAlbumDocument,
} from "./schemas/gallery-album.schema";
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

const TAG = "gallery";

export class GalleryRepository extends BaseRepository<GalleryAlbumEntity> {}

@Injectable()
export class GalleryService {
  private readonly repo: GalleryRepository;

  constructor(
    @InjectModel(GalleryAlbumEntity.name) model: Model<GalleryAlbumEntity>,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
    private readonly notifier: NotificationsService,
  ) {
    this.repo = new GalleryRepository(model);
  }

  private toPublic(doc: GalleryAlbumDocument): GalleryAlbum {
    return serializeDoc<GalleryAlbum>(doc, [...ADMIN_ONLY_FIELDS]);
  }

  private toAdmin(doc: GalleryAlbumDocument): WithSchedule<GalleryAlbum> {
    return serializeDoc<WithSchedule<GalleryAlbum>>(doc);
  }

  /**
   * F-003: a record cannot be *published* while its slug, title (either
   * language) or an item caption still reads as placeholder text. Drafts are exempt.
   */
  private assertPublishable(record: {
    slug: string;
    title: { en?: string; ta?: string };
    photos?: Array<{ caption?: { en?: string; ta?: string } }>;
  }): void {
    assertNoPlaceholderContent({
      kind: "album",
      slug: record.slug,
      title: record.title,
      extra: (record.photos ?? []).map((photo, index) => ({
        label: `item ${index + 1} caption`,
        value: photo.caption,
      })),
    });
  }

  /* ------------------------------- Public API ------------------------------ */

  /** GET /gallery — newest first by album `date` (contract §5.3). */
  listPublic(
    query: PaginationQueryDto,
    fellowship?: FellowshipSlug,
  ): Promise<GalleryAlbum[] | Paginated<GalleryAlbum>> {
    const filter: FilterQuery<GalleryAlbumEntity> = publiclyVisible<GalleryAlbumEntity>();
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
    const docs = await this.repo.find(publiclyVisible<GalleryAlbumEntity>(), { date: -1 });
    return docs.map((doc) => doc.slug);
  }

  async getPublicBySlug(slug: string): Promise<GalleryAlbum> {
    const doc = await this.repo.findOne({ ...publiclyVisible<GalleryAlbumEntity>(), slug });
    if (!doc) throw new NotFoundException(`Album "${slug}" was not found`);
    return this.toPublic(doc);
  }

  /* ------------------------------- Admin API ------------------------------- */

  async listAdmin(
    page: number,
    pageSize: number,
    search?: string,
    status?: PublishStatus,
  ): Promise<Paginated<WithSchedule<GalleryAlbum>>> {
    const filter: FilterQuery<GalleryAlbumEntity> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { "title.en": containsInsensitive(search) },
        { "title.ta": containsInsensitive(search) },
        { slug: containsInsensitive(search) },
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

  async getAdminById(id: string): Promise<WithSchedule<GalleryAlbum>> {
    return this.toAdmin(await this.repo.findByIdOrThrow(id));
  }

  async create(
    dto: CreateAlbumDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<GalleryAlbum>> {
    assertMayWrite(actor, dto.status);
    const slug = await uniqueSlug(dto.title.en, (candidate) =>
      this.repo.exists({ slug: candidate }),
    );
    // The album's photos and videos can come with it, so it is created whole
    // in one step rather than empty and filled in afterwards.
    const { photos: requested, ...fields } = dto;
    const photos = this.toItems(requested ?? []);
    if ((dto.status ?? "draft") === "published") {
      this.assertPublishable({ slug, title: dto.title, photos });
    }
    const doc = await this.repo.create({
      // Remembered so the writer can be told what became of it.
      ...(canPublish(actor) ? {} : { submittedBy: { userId: actor.userId, name: actor.name } }),
      ...fields,
      date: new Date(dto.date),
      publishAt: scheduleValue(dto.publishAt) ?? undefined,
      slug,
      status: dto.status ?? defaultStatusFor(actor, "draft"),
      photos,
    });
    await this.audit.log(
      actor,
      "create",
      TAG,
      doc.id,
      photos.length > 0
        ? `Created album "${dto.title.en}" with ${photos.length} item(s)`
        : `Created album "${dto.title.en}"`,
    );
    if (doc.status === "published") this.revalidate.trigger(TAG);
    if (doc.status === "pending") {
      await this.notifier.submitted(actor, contentSubject("gallery", doc.id, doc.title.en));
    }
    return this.toAdmin(doc);
  }

  async update(
    id: string,
    dto: UpdateAlbumDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<GalleryAlbum>> {
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
        `Submitted changes to album "${held.title.en}" for approval`,
      );
      await this.notifier.changesSubmitted(actor, contentSubject("gallery", id, held.title.en));
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

    // Photos in an update are applied only when approving a submission that
    // changed them (see UpdateAlbumDto.photos); otherwise ignored.
    const { photos: sentPhotos, ...fields } = dto;
    const approvingPhotos =
      sentPhotos !== undefined && existing.revision?.changes?.photos !== undefined;
    const photos = approvingPhotos ? this.toItems(sentPhotos) : undefined;

    if ((dto.status ?? existing.status) === "published") {
      this.assertPublishable({
        slug,
        title: dto.title ?? existing.title,
        photos: photos ?? existing.photos,
      });
    }

    const doc = await this.repo.updateById(id, {
      // Saving by an approver (or an edit to a draft) settles any waiting change.
      $unset: { revision: 1 },
      ...(!canPublish(actor) && (dto.status ?? existing.status) === "pending"
        ? { submittedBy: { userId: actor.userId, name: actor.name } }
        : {}),
      ...fields,
      ...(photos ? { photos } : {}),
      slug,
      ...(dto.publishAt !== undefined ? { publishAt: scheduleValue(dto.publishAt) } : {}),
      ...(dto.date ? { date: new Date(dto.date) } : {}),
    });
    await this.audit.log(actor, "update", TAG, id, `Updated album "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(
      this.notifier,
      actor,
      canPublish(actor),
      existing,
      doc.status,
      contentSubject("gallery", id, doc.title.en),
    );
    return this.toAdmin(doc);
  }

  async setStatus(
    id: string,
    status: PublishStatus,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<GalleryAlbum>> {
    const before = await this.repo.findByIdOrThrow(id);
    if (status === "published") {
      this.assertPublishable(await this.repo.findByIdOrThrow(id));
    }
    const doc = await this.repo.updateById(id, { status });
    const action =
      status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
    await this.audit.log(actor, action, TAG, id, `${action} album "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
    await notifyTransition(this.notifier, actor, true, before, status, contentSubject("gallery", id, doc.title.en));
    return this.toAdmin(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const current = await this.repo.findByIdOrThrow(id);
    assertMayDelete(actor, current.status);
    const doc = await this.repo.deleteById(id);
    await this.audit.log(actor, "delete", TAG, id, `Deleted album "${doc.title.en}"`);
    this.revalidate.trigger(TAG);
  }

  /* ----------------------------- Photo handling ---------------------------- */

  /** Request items → stored items: ids assigned, video links checked. */
  private toItems(photos: Array<AddPhotoDto & { id?: string }>) {
    return photos.map((photo) => {
      if (!photo.video) {
        return { id: photo.id ?? randomUUID(), image: photo.image, caption: photo.caption };
      }
      const provider = photo.video.provider ?? inferVideoProvider(photo.video.url);
      // Caught here rather than on the live site, where an unparseable link
      // renders an empty player with no clue as to why.
      const problem = describeVideoProblem(photo.video.url, provider);
      if (problem) throw new BadRequestException(problem);

      return {
        id: photo.id ?? randomUUID(),
        image: photo.image,
        caption: photo.caption,
        // Stored rather than left to the client to work out, so every
        // consumer sees the same value.
        video: { url: photo.video.url, provider },
      };
    });
  }

  async addPhotos(
    id: string,
    dto: AddPhotosDto,
    actor: AuthenticatedUser,
  ): Promise<WithSchedule<GalleryAlbum>> {
    const additions = this.toItems(dto.photos);
    const album = await this.repo.findByIdOrThrow(id);
    assertMayWrite(actor, undefined, album.status);
    if (album.status === "published") {
      this.assertPublishable({ slug: album.slug, title: album.title, photos: additions });
    }
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
  ): Promise<WithSchedule<GalleryAlbum>> {
    const album = await this.repo.findByIdOrThrow(id);
    assertMayWrite(actor, undefined, album.status);
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
  ): Promise<WithSchedule<GalleryAlbum>> {
    const existing = await this.repo.findByIdOrThrow(id);
    assertMayWrite(actor, undefined, existing.status);
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
      `Rejected ${who}'s changes to album "${doc.title.en}"`,
    );
    await this.notifier.rejected(
      actor,
      existing.revision.submittedBy,
      contentSubject("gallery", id, doc.title.en),
      true,
    );
    return this.toAdmin(doc);
  }
}
