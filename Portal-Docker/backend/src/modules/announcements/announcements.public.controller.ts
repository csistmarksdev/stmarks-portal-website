import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { FellowshipSlug } from "@portal/shared";

import { Public } from "../../common/decorators/public.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AnnouncementsService } from "./announcements.service";

@ApiTags("Public — Announcements")
@Public()
@Controller("announcements")
export class AnnouncementsPublicController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: "List announcements — pinned first, then newest (§5.4)" })
  @ApiQuery({ name: "fellowship", required: false })
  list(
    @Query() query: PaginationQueryDto,
    @Query("fellowship") fellowship?: FellowshipSlug,
  ) {
    return this.announcements.listPublic(query, fellowship);
  }

  @Get("pinned")
  @ApiOperation({ summary: "The pinned announcement, or null" })
  pinned() {
    return this.announcements.getPinned();
  }
}
