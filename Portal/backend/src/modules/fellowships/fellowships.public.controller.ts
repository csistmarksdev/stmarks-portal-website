import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../../common/decorators/public.decorator";
import { FellowshipsService } from "./fellowships.service";

@ApiTags("Public — Fellowships")
@Public()
@Controller("fellowships")
export class FellowshipsPublicController {
  constructor(private readonly fellowships: FellowshipsService) {}

  @Get()
  @ApiOperation({ summary: "All fellowships sorted by order (§5.6)" })
  list() {
    return this.fellowships.listPublic();
  }

  @Get("slugs")
  @ApiOperation({ summary: "Fellowship slugs (fixed enum)" })
  slugs() {
    return this.fellowships.publicSlugs();
  }

  @Get(":slug")
  @ApiOperation({ summary: "One fellowship by slug (404 if missing)" })
  bySlug(@Param("slug") slug: string) {
    return this.fellowships.getPublicBySlug(slug);
  }
}
