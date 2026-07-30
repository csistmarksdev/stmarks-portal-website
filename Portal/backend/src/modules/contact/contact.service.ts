import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  ContactMessage,
  ContactSubmissionResult,
  Paginated,
} from "@portal/shared";
import { Model } from "mongoose";
import type { FilterQuery } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { serializeDoc } from "../../common/utils/serialize";
import { AuditService } from "../audit/audit.service";
import { ContactFormDto } from "./dto/contact.dto";
import { ContactMessageEntity } from "./schemas/contact-message.schema";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectModel(ContactMessageEntity.name)
    private readonly model: Model<ContactMessageEntity>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Contract §5.9 — `messageKey` is an i18n key the Website form surfaces,
   * never a raw display string. Failures return `{ success: false }` rather
   * than throwing so the form always gets the contracted shape.
   */
  async submit(dto: ContactFormDto): Promise<ContactSubmissionResult> {
    try {
      await this.model.create({ ...dto });
      return { success: true, messageKey: "success" };
    } catch (error) {
      this.logger.error("Failed to store contact submission", error as Error);
      return { success: false, messageKey: "error" };
    }
  }

  /* ------------------------------ Admin inbox ------------------------------ */

  async list(
    page: number,
    pageSize: number,
    unreadOnly?: boolean,
  ): Promise<Paginated<ContactMessage>> {
    const filter: FilterQuery<ContactMessageEntity> = unreadOnly
      ? { read: false }
      : {};
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
      items: docs.map((doc) => serializeDoc<ContactMessage>(doc)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async setRead(id: string, read: boolean): Promise<ContactMessage> {
    const doc = await this.model
      .findByIdAndUpdate(id, { read }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Contact message ${id} was not found`);
    return serializeDoc<ContactMessage>(doc);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
    await this.audit.log(actor, "delete", "contact", id, "Deleted a contact message");
  }

  countUnread(): Promise<number> {
    return this.model.countDocuments({ read: false }).exec();
  }

  countAll(): Promise<number> {
    return this.model.countDocuments().exec();
  }
}
