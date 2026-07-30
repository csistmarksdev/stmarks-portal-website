import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { FellowshipSlug } from "@portal/shared";

import { Public } from "../../common/decorators/public.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { GalleryService } from "./gallery.service";

@ApiTags("Public — Gallery")
@Public()
@Controller("gallery")
export class GalleryPublicController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @ApiOperation({ summary: "List published albums, newest first by date (§5.3)" })
  @ApiQuery({ name: "fellowship", required: false })
  list(
    @Query() query: PaginationQueryDto,
    @Query("fellowship") fellowship?: FellowshipSlug,
  ) {
    return this.gallery.listPublic(query, fellowship);
  }

  @Get("slugs")
  @ApiOperation({ summary: "All published album slugs (generateStaticParams)" })
  slugs() {
    return this.gallery.publicSlugs();
  }

  @Get(":slug")
  @ApiOperation({ summary: "One published album incl. full photos[] (404 if missing)" })
  bySlug(@Param("slug") slug: string) {
    return this.gallery.getPublicBySlug(slug);
  }
}
