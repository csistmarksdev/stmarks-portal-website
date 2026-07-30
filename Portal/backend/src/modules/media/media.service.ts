import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { MediaItem, MediaKind, Paginated } from "@portal/shared";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";
import sharp from "sharp";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { humanFileSize } from "../../common/utils/format";
import {
  inferVideoProvider,
  vimeoId,
  youTubeId,
} from "../../common/utils/video";
import { AuditService } from "../audit/audit.service";
import { MediaEntity, type MediaDocument } from "./schemas/media.schema";

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/**
 * Formats a browser can play in a `<video>` tag — the same set the Website's
 * inline player handles. Anything else would upload happily and then refuse
 * to play, so it is rejected here.
 */
const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const DOCUMENT_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

const THUMB_WIDTH = 480;
const BLUR_WIDTH = 16;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadRoot: string;
  private readonly publicUrl: string;
  private readonly maxBytes: number;
  private readonly maxVideoBytes: number;

  constructor(
    @InjectModel(MediaEntity.name) private readonly model: Model<MediaEntity>,
    config: ConfigService,
    private readonly audit: AuditService,
  ) {
    this.uploadRoot = join(process.cwd(), config.get<string>("uploadDir", "uploads"));
    this.publicUrl = config.get<string>("publicUrl", "http://localhost:4000");
    this.maxBytes = config.get<number>("maxUploadMb", 15) * 1024 * 1024;
    this.maxVideoBytes = config.get<number>("maxVideoUploadMb", 200) * 1024 * 1024;
  }

  private toItem(doc: MediaDocument): MediaItem {
    const base = `${this.publicUrl}/uploads`;
    return {
      id: doc.id,
      kind: doc.kind,
      url: `${base}/${doc.path}`,
      thumbnailUrl: doc.thumbnailPath ? `${base}/${doc.thumbnailPath}` : undefined,
      filename: doc.filename,
      mimeType: doc.mimeType,
      format: doc.format,
      sizeBytes: doc.sizeBytes,
      size: doc.size,
      width: doc.width,
      height: doc.height,
      blurDataURL: doc.blurDataURL,
      alt: doc.alt,
      createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  private kindOf(mimeType: string): MediaKind {
    if (IMAGE_MIMES.has(mimeType)) return "image";
    if (VIDEO_MIMES.has(mimeType)) return "video";
    if (mimeType === "application/pdf") return "pdf";
    if (DOCUMENT_MIMES.has(mimeType)) return "document";
    throw new BadRequestException(`Unsupported file type: ${mimeType}`);
  }

  /** Video files are far larger than a photo or a bulletin, so they get their own ceiling. */
  private limitFor(kind: MediaKind): number {
    return kind === "video" ? this.maxVideoBytes : this.maxBytes;
  }

  /**
   * Stores an upload. Images get intrinsic dimensions, a WebP thumbnail and
   * a base64 blur preview (spec §6 — the Website's `next/image` needs
   * width/height and ideally `blurDataURL`).
   */
  async upload(
    file: Express.Multer.File,
    alt: { en?: string; ta?: string } | undefined,
    actor: AuthenticatedUser,
  ): Promise<MediaItem> {
    const kind = this.kindOf(file.mimetype);

    const limit = this.limitFor(kind);
    if (file.size > limit) {
      throw new BadRequestException(
        `That ${kind} is ${humanFileSize(file.size)}; the limit is ${humanFileSize(limit)}.`,
      );
    }

    const id = randomUUID();
    const ext = (extname(file.originalname) || `.${file.mimetype.split("/")[1]}`)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");

    const dir = kind === "image" ? "images" : kind === "video" ? "videos" : "files";
    const path = `${dir}/${id}${ext}`;
    await mkdir(join(this.uploadRoot, dir), { recursive: true });
    await writeFile(join(this.uploadRoot, path), file.buffer);

    let width: number | undefined;
    let height: number | undefined;
    let thumbnailPath: string | undefined;
    let blurDataURL: string | undefined;

    if (kind === "image") {
      try {
        const image = sharp(file.buffer, { failOn: "none" });
        const metadata = await image.metadata();
        width = metadata.width;
        height = metadata.height;

        await mkdir(join(this.uploadRoot, "thumbs"), { recursive: true });
        thumbnailPath = `thumbs/${id}.webp`;
        await sharp(file.buffer)
          .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toFile(join(this.uploadRoot, thumbnailPath));

        const blurBuffer = await sharp(file.buffer)
          .resize({ width: BLUR_WIDTH })
          .jpeg({ quality: 45 })
          .toBuffer();
        blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;
      } catch (error) {
        this.logger.warn(
          `Image processing failed for ${file.originalname}: ${(error as Error).message}`,
        );
      }
    }

    const doc = await this.model.create({
      kind,
      path,
      thumbnailPath,
      filename: file.originalname,
      mimeType: file.mimetype,
      format: ext.replace(".", "").toUpperCase() || "BIN",
      sizeBytes: file.size,
      size: humanFileSize(file.size),
      width,
      height,
      blurDataURL,
      alt:
        alt?.en || alt?.ta
          ? { en: alt.en ?? "", ta: alt.ta ?? "" }
          : undefined,
    });

    await this.audit.log(actor, "upload", "media", doc.id, `Uploaded ${kind} "${file.originalname}"`);
    return this.toItem(doc);
  }

  /**
   * Fetches a hosted clip's own thumbnail and stores it as the poster frame.
   *
   * Every gallery item needs an `image`, so without this an admin adding a
   * YouTube link would have to hunt down a still by hand. The thumbnail is
   * copied into our media library rather than hot-linked, so the Website only
   * ever loads images from one origin and nothing breaks if the remote host
   * changes its URLs.
   *
   * Throws 422 when no thumbnail can be had — the caller then asks the admin
   * to choose a poster, so the flow degrades rather than dead-ends.
   */
  async createPosterFromVideoUrl(
    url: string,
    actor: AuthenticatedUser,
  ): Promise<MediaItem> {
    const provider = inferVideoProvider(url);
    const candidates: string[] = [];

    if (provider === "youtube") {
      const id = youTubeId(url);
      if (!id) {
        throw new UnprocessableEntityException(
          "That YouTube link has no video id, so its thumbnail cannot be found.",
        );
      }
      // maxres is absent on older/low-res uploads; hq always exists.
      candidates.push(
        `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      );
    } else if (provider === "vimeo") {
      const id = vimeoId(url);
      if (!id) {
        throw new UnprocessableEntityException(
          "That Vimeo link has no video id, so its thumbnail cannot be found.",
        );
      }
      const thumbnail = await this.vimeoThumbnail(id);
      if (!thumbnail) {
        throw new UnprocessableEntityException(
          "Vimeo did not return a thumbnail for that video. Choose a poster image instead.",
        );
      }
      candidates.push(thumbnail);
    } else {
      throw new UnprocessableEntityException(
        "A poster image cannot be derived from a video file. Choose one from the media library.",
      );
    }

    for (const candidate of candidates) {
      const fetched = await this.fetchImage(candidate);
      if (!fetched) continue;
      return this.upload(
        {
          buffer: fetched.buffer,
          originalname: `${provider}-poster.jpg`,
          mimetype: fetched.mimeType,
          size: fetched.buffer.length,
        } as Express.Multer.File,
        { en: "Video thumbnail", ta: "வீடியோ சிறுபடம்" },
        actor,
      );
    }

    throw new UnprocessableEntityException(
      "Could not download that video's thumbnail. Choose a poster image instead.",
    );
  }

  private async fetchImage(
    url: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return null;
      const mimeType = response.headers.get("content-type") ?? "image/jpeg";
      if (!mimeType.startsWith("image/")) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      // YouTube answers a missing size with a tiny grey placeholder.
      if (buffer.length < 2048) return null;
      return { buffer, mimeType };
    } catch (error) {
      this.logger.warn(`Could not fetch poster ${url}: ${(error as Error).message}`);
      return null;
    }
  }

  private async vimeoThumbnail(id: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) return null;
      const body = (await response.json()) as { thumbnail_url?: string };
      return body.thumbnail_url ?? null;
    } catch (error) {
      this.logger.warn(`Vimeo oEmbed failed for ${id}: ${(error as Error).message}`);
      return null;
    }
  }

  async list(
    page: number,
    pageSize: number,
    kind?: MediaKind,
    search?: string,
  ): Promise<Paginated<MediaItem>> {
    const filter: FilterQuery<MediaEntity> = {};
    if (kind) filter.kind = kind;
    if (search) filter.filename = { $regex: search, $options: "i" };

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toItem(doc)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async getById(id: string): Promise<MediaItem> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`Media ${id} was not found`);
    return this.toItem(doc);
  }

  async updateAlt(
    id: string,
    alt: { en: string; ta: string },
    actor: AuthenticatedUser,
  ): Promise<MediaItem> {
    const doc = await this.model
      .findByIdAndUpdate(id, { alt }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Media ${id} was not found`);
    await this.audit.log(actor, "update", "media", id, `Updated alt text for "${doc.filename}"`);
    return this.toItem(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`Media ${id} was not found`);

    const paths = [doc.path, doc.thumbnailPath].filter(Boolean) as string[];
    for (const relative of paths) {
      try {
        await unlink(join(this.uploadRoot, relative));
      } catch {
        // Already gone — the DB record is the source of truth.
      }
    }
    await this.audit.log(actor, "delete", "media", id, `Deleted media "${doc.filename}"`);
  }

  count(): Promise<number> {
    return this.model.countDocuments().exec();
  }
}
