import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import {
  PastorMessageDto,
  ServiceTimingsDto,
  WeeklyVerseDto,
} from "./dto/church.dto";
import { ChurchService } from "./church.service";

/**
 * Editors for the three church singletons that actually change. The profile,
 * history, vision & mission, diocese and hero slides are hardcoded in the
 * Website and intentionally have no CMS surface here.
 */
@ApiTags("Admin — Church")
@ApiBearerAuth()
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
}
