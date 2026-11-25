import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MAX_FEATURED_SERVICES } from "@portal/shared";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import {
  PastorMessageDto,
  ServiceTimingsDto,
  WeeklyVerseDto,
} from "./dto/church.dto";
import { ChurchService } from "./church.service";
import { SINGLETON_KEYS, type SingletonKey } from "./schemas/singleton.schema";

const KEY_ENUM = Object.fromEntries(SINGLETON_KEYS.map((key) => [key, key]));

/**
 * Editors for the three church singletons that actually change. The profile,
 * history, vision & mission, diocese and hero slides are hardcoded in the
 * Website and intentionally have no CMS surface here.
 */
@ApiTags("Admin: Church")
@ApiBearerAuth()
/*
 * Saving needs `content.write`. Under the approval rule an approver's save
 * (`content.publish`) goes live at once; anyone else's is held as a
 * submission until an admin approves it (by saving) or rejects it.
 */
@RequirePermissions("content.write")
@Controller("admin/church")
export class ChurchAdminController {
  constructor(private readonly church: ChurchService) {}

  @Get("service-timings")
  @RequirePermissions("content.read")
  getServiceTimings() {
    return this.church.get("service-timings");
  }

  @Put("service-timings")
  @ApiOperation({ summary: "Replace the service timings list" })
  setServiceTimings(
    @Body() dto: ServiceTimingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const featured = dto.items.filter((item) => item.featured).length;
    if (featured > MAX_FEATURED_SERVICES) {
      throw new BadRequestException(
        `Only ${MAX_FEATURED_SERVICES} services can be featured in the homepage hero; ${featured} are`,
      );
    }
    return this.church.set("service-timings", this.church.withIds(dto.items), actor);
  }

  @Get("pastor-message")
  @RequirePermissions("content.read")
  getPastorMessage() {
    return this.church.get("pastor-message");
  }

  @Put("pastor-message")
  @ApiOperation({ summary: "Update the pastor's message" })
  setPastorMessage(
    @Body() dto: PastorMessageDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.church.set("pastor-message", dto, actor);
  }

  @Get("weekly-verse")
  @RequirePermissions("content.read")
  getWeeklyVerse() {
    return this.church.get("weekly-verse");
  }

  @Put("weekly-verse")
  @ApiOperation({ summary: "Update the weekly verse" })
  setWeeklyVerse(
    @Body() dto: WeeklyVerseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.church.set("weekly-verse", dto, actor);
  }

  @Get(":key/pending")
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "The change waiting for approval, or null" })
  getPending(@Param("key", new ParseEnumPipe(KEY_ENUM)) key: SingletonKey) {
    return this.church.pending(key);
  }

  @Post(":key/reject")
  @RequirePermissions("content.publish")
  @HttpCode(204)
  @ApiOperation({ summary: "Discard the change waiting for approval" })
  async reject(
    @Param("key", new ParseEnumPipe(KEY_ENUM)) key: SingletonKey,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.church.reject(key, actor);
  }
}
