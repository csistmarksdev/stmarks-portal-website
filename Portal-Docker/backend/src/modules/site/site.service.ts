import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  type SiteMaintenance,
  type SiteMaintenanceAdmin,
  type SiteStatus,
} from "@portal/shared";
import { Model } from "mongoose";

import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { AuditService } from "../audit/audit.service";
import { UpdateMaintenanceDto } from "./dto/maintenance.dto";
import { SiteSettingEntity } from "./schemas/site-setting.schema";

const MAINTENANCE = "maintenance";

const OFF: SiteMaintenance = { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE };

/**
 * Maintenance mode. The Portal stores the switch and serves it publicly; the
 * Website decides what to do with it (show a notice instead of its pages).
 */
@Injectable()
export class SiteService {
  constructor(
    @InjectModel(SiteSettingEntity.name) private readonly model: Model<SiteSettingEntity>,
    private readonly audit: AuditService,
  ) {}

  async maintenanceAdmin(): Promise<SiteMaintenanceAdmin> {
    const doc = await this.model.findOne({ key: MAINTENANCE }).lean().exec();
    if (!doc) return OFF;
    return {
      ...(doc.data as SiteMaintenance),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      ...(doc.updatedBy ? { updatedBy: doc.updatedBy } : {}),
    };
  }

  /** What the public website sees. */
  async status(): Promise<SiteStatus> {
    const { enabled, message, until } = await this.maintenanceAdmin();
    return { maintenance: { enabled, message, ...(until ? { until } : {}) } };
  }

  async setMaintenance(
    dto: UpdateMaintenanceDto,
    actor: AuthenticatedUser,
  ): Promise<SiteMaintenanceAdmin> {
    const before = await this.maintenanceAdmin();
    const data: SiteMaintenance = {
      enabled: dto.enabled,
      message: dto.message,
      ...(dto.until ? { until: new Date(dto.until).toISOString() } : {}),
    };
    await this.model
      .findOneAndUpdate(
        { key: MAINTENANCE },
        { $set: { key: MAINTENANCE, data, updatedBy: { userId: actor.userId, name: actor.name } } },
        { upsert: true, new: true },
      )
      .exec();

    const summary =
      before.enabled === data.enabled
        ? "Updated the maintenance notice"
        : data.enabled
          ? "Put the website into maintenance mode"
          : "Took the website out of maintenance mode";
    await this.audit.log(actor, "update", "site", MAINTENANCE, summary);
    return this.maintenanceAdmin();
  }
}
