import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { PublishStatus } from "@portal/shared";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SetStatusDto } from "../../common/dto/set-status.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { CreateEventDto, UpdateEventDto } from "./dto/create-event.dto";
import { EventsService } from "./events.service";

@ApiTags("Admin — Events")
@ApiBearerAuth()
@Controller("admin/events")
export class EventsAdminController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "List all events incl. drafts (paginated)" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("status") status?: PublishStatus,
  ) {
    return this.events.listAdmin(
      query.page ?? 1,
      query.pageSize ?? 20,
      query.search,
      status,
    );
  }

  @Get(":id")
  @RequirePermissions("content.read")
  getById(@Param("id") id: string) {
    return this.events.getAdminById(id);
  }

  @Post()
  @RequirePermissions("content.write")
  create(@Body() dto: CreateEventDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.events.create(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("content.write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.events.update(id, dto, actor);
  }

  @Patch(":id/status")
  @RequirePermissions("content.publish")
  @ApiOperation({ summary: "Draft / publish / archive an event" })
  setStatus(
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.events.setStatus(id, dto.status, actor);
  }

  @Delete(":id")
  @RequirePermissions("content.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.events.remove(id, actor);
  }
}
