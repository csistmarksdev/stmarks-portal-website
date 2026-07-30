import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { FellowshipSlug } from "@portal/shared";

import { Public } from "../../common/decorators/public.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { BlogService } from "./blog.service";

@ApiTags("Public — Blog")
@Public()
@Controller("blog")
export class BlogPublicController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  @ApiOperation({ summary: "List published blog posts, newest first (§5.2)" })
  @ApiQuery({ name: "event", required: false, description: "Filter by event slug" })
  @ApiQuery({ name: "fellowship", required: false })
  list(
    @Query() query: PaginationQueryDto,
    @Query("event") event?: string,
    @Query("fellowship") fellowship?: FellowshipSlug,
  ) {
    return this.blog.listPublic(query, event, fellowship);
  }

  @Get("slugs")
  @ApiOperation({ summary: "All published post slugs (generateStaticParams)" })
  slugs() {
    return this.blog.publicSlugs();
  }

  @Get(":slug")
  @ApiOperation({ summary: "One published post by slug (404 if missing)" })
  bySlug(@Param("slug") slug: string) {
    return this.blog.getPublicBySlug(slug);
  }
}
