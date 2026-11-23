import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { DashboardStats } from "@portal/shared";
import { Model } from "mongoose";

import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import {
  AnnouncementEntity,
  AnnouncementSchema,
} from "../announcements/schemas/announcement.schema";
import { BlogPostEntity, BlogPostSchema } from "../blog/schemas/blog-post.schema";
import {
  ContactMessageEntity,
  ContactMessageSchema,
} from "../contact/schemas/contact-message.schema";
import { DownloadEntity, DownloadSchema } from "../downloads/schemas/download.schema";
import { ChurchEventEntity, ChurchEventSchema } from "../events/schemas/event.schema";
import {
  FellowshipEntity,
  FellowshipSchema,
} from "../fellowships/schemas/fellowship.schema";
import {
  GalleryAlbumEntity,
  GalleryAlbumSchema,
} from "../gallery/schemas/gallery-album.schema";
import { MediaEntity, MediaSchema } from "../media/schemas/media.schema";
import { User, UserSchema } from "../users/schemas/user.schema";

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(ChurchEventEntity.name) private readonly events: Model<ChurchEventEntity>,
    @InjectModel(BlogPostEntity.name) private readonly blog: Model<BlogPostEntity>,
    @InjectModel(GalleryAlbumEntity.name) private readonly gallery: Model<GalleryAlbumEntity>,
    @InjectModel(AnnouncementEntity.name) private readonly announcements: Model<AnnouncementEntity>,
    @InjectModel(DownloadEntity.name) private readonly downloads: Model<DownloadEntity>,
    @InjectModel(FellowshipEntity.name) private readonly fellowships: Model<FellowshipEntity>,
    @InjectModel(MediaEntity.name) private readonly media: Model<MediaEntity>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(ContactMessageEntity.name) private readonly contact: Model<ContactMessageEntity>,
  ) {}

  /** New submissions and changes to live items, per type, awaiting an approver. */
  private async approvals(): Promise<DashboardStats["approvals"]> {
    const models = {
      events: this.events,
      blog: this.blog,
      gallery: this.gallery,
      announcements: this.announcements,
      downloads: this.downloads,
      fellowships: this.fellowships,
    } as const;
    const entries = await Promise.all(
      Object.entries(models).map(async ([type, model]) => {
        const m = model as unknown as Model<{ status: string; revision?: unknown }>;
        const [submissions, changes] = await Promise.all([
          m.countDocuments({ status: "pending" }).exec(),
          m.countDocuments({ revision: { $exists: true } }).exec(),
        ]);
        return [type, { submissions, changes }] as const;
      }),
    );
    return Object.fromEntries(entries) as DashboardStats["approvals"];
  }

  async stats(): Promise<DashboardStats> {
    const now = new Date();
    const [
      eventsTotal,
      eventsPublished,
      eventsUpcoming,
      blogTotal,
      blogPublished,
      albums,
      photosAgg,
      announcementsTotal,
      announcementsPinned,
      downloadsTotal,
      fellowshipsTotal,
      mediaTotal,
      usersTotal,
      contactTotal,
      contactUnread,
    ] = await Promise.all([
      this.events.countDocuments().exec(),
      this.events.countDocuments({ status: "published" }).exec(),
      this.events
        .countDocuments({
          status: "published",
          $or: [{ endDate: { $gte: now } }, { endDate: null, startDate: { $gte: now } }],
        })
        .exec(),
      this.blog.countDocuments().exec(),
      this.blog.countDocuments({ status: "published" }).exec(),
      this.gallery.countDocuments().exec(),
      this.gallery
        .aggregate<{ total: number }>([
          { $project: { count: { $size: { $ifNull: ["$photos", []] } } } },
          { $group: { _id: null, total: { $sum: "$count" } } },
        ])
        .exec(),
      this.announcements.countDocuments().exec(),
      this.announcements.countDocuments({ pinned: true }).exec(),
      this.downloads.countDocuments().exec(),
      this.fellowships.countDocuments().exec(),
      this.media.countDocuments().exec(),
      this.users.countDocuments().exec(),
      this.contact.countDocuments().exec(),
      this.contact.countDocuments({ read: false }).exec(),
    ]);

    return {
      events: { total: eventsTotal, published: eventsPublished, upcoming: eventsUpcoming },
      blog: { total: blogTotal, published: blogPublished },
      gallery: { albums, photos: photosAgg[0]?.total ?? 0 },
      announcements: { total: announcementsTotal, pinned: announcementsPinned },
      downloads: { total: downloadsTotal },
      fellowships: { total: fellowshipsTotal },
      media: { total: mediaTotal },
      users: { total: usersTotal },
      contact: { total: contactTotal, unread: contactUnread },
      approvals: await this.approvals(),
    };
  }
}

@ApiTags("Admin — Dashboard")
@ApiBearerAuth()
@Controller("admin/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("stats")
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "Aggregate counts for the CMS dashboard" })
  stats() {
    return this.dashboard.stats();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChurchEventEntity.name, schema: ChurchEventSchema },
      { name: BlogPostEntity.name, schema: BlogPostSchema },
      { name: GalleryAlbumEntity.name, schema: GalleryAlbumSchema },
      { name: AnnouncementEntity.name, schema: AnnouncementSchema },
      { name: DownloadEntity.name, schema: DownloadSchema },
      { name: FellowshipEntity.name, schema: FellowshipSchema },
      { name: MediaEntity.name, schema: MediaSchema },
      { name: User.name, schema: UserSchema },
      { name: ContactMessageEntity.name, schema: ContactMessageSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
