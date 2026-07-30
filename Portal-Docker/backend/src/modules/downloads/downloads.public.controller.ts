import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { DownloadCategory, FellowshipSlug } from "@portal/shared";

import { Public } from "../../common/decorators/public.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { DownloadsService } from "./downloads.service";

@ApiTags("Public — Downloads")
@Public()
@Controller("downloads")
export class DownloadsPublicController {
  constructor(private readonly downloads: DownloadsService) {}

  @Get()
  @ApiOperation({ summary: "List published downloads, newest first (§5.5)" })
  @ApiQuery({ name: "category", required: false, enum: ["bulletin", "form", "document"] })
  @ApiQuery({ name: "fellowship", required: false })
  list(
    @Query() query: PaginationQueryDto,
    @Query("category") category?: DownloadCategory,
    @Query("fellowship") fellowship?: FellowshipSlug,
  ) {
    return this.downloads.listPublic(query, category, fellowship);
  }

  @Get("grouped")
  @ApiOperation({ summary: "All downloads grouped by category (one call)" })
  grouped() {
    return this.downloads.grouped();
  }
}
