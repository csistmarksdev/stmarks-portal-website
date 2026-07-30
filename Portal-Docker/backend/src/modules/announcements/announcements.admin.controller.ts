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
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import type { PublishStatus } from "@portal/shared";
import { IsBoolean } from "class-validator";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SetStatusDto } from "../../common/dto/set-status.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "./dto/announcement.dto";
import { AnnouncementsService } from "./announcements.service";

export class SetPinnedDto {
  @ApiProperty()
  @IsBoolean()
  pinned: boolean;
}

@ApiTags("Admin — Announcements")
@ApiBearerAuth()
@Controller("admin/announcements")
export class AnnouncementsAdminController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "List all announcements incl. drafts (paginated)" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("status") status?: PublishStatus,
  ) {
    return this.announcements.listAdmin(
      query.page ?? 1,
      query.pageSize ?? 20,
      query.search,
      status,
    );
  }

  @Get(":id")
  @RequirePermissions("content.read")
  getById(@Param("id") id: string) {
    return this.announcements.getAdminById(id);
  }

  @Post()
  @RequirePermissions("content.write")
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.announcements.create(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("content.write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.announcements.update(id, dto, actor);
  }

  @Patch(":id/pin")
  @RequirePermissions("content.publish")
  @ApiOperation({ summary: "Pin/unpin — pinning unpins every other announcement" })
  setPinned(
    @Param("id") id: string,
    @Body() dto: SetPinnedDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.announcements.setPinned(id, dto.pinned, actor);
  }

  @Patch(":id/status")
  @RequirePermissions("content.publish")
  setStatus(
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.announcements.setStatus(id, dto.status, actor);
  }

  @Delete(":id")
  @RequirePermissions("content.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.announcements.remove(id, actor);
  }
}
