import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { FellowshipSlug } from "@portal/shared";

import { Public } from "../../common/decorators/public.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { EventsService } from "./events.service";

@ApiTags("Public — Events")
@Public()
@Controller("events")
export class EventsPublicController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ summary: "List published events (Website contract §5.1)" })
  @ApiQuery({ name: "status", required: false, enum: ["upcoming", "past"] })
  @ApiQuery({ name: "fellowship", required: false })
  @ApiQuery({ name: "featured", required: false, type: Boolean })
  list(
    @Query() query: PaginationQueryDto,
    @Query("status") status?: "upcoming" | "past",
    @Query("fellowship") fellowship?: FellowshipSlug,
    @Query("featured") featured?: string,
  ) {
    return this.events.listPublic(query, status, fellowship, featured === "true");
  }

  @Get("slugs")
  @ApiOperation({ summary: "All published event slugs (generateStaticParams)" })
  slugs() {
    return this.events.publicSlugs();
  }

  @Get(":slug")
  @ApiOperation({ summary: "One published event by slug (404 if missing)" })
  bySlug(@Param("slug") slug: string) {
    return this.events.getPublicBySlug(slug);
  }
}
