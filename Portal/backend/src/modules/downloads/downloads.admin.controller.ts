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
import type { DownloadCategory, PublishStatus } from "@portal/shared";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { SetStatusDto } from "../../common/dto/set-status.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { CreateDownloadDto, UpdateDownloadDto } from "./dto/download.dto";
import { DownloadsService } from "./downloads.service";

@ApiTags("Admin — Downloads")
@ApiBearerAuth()
@Controller("admin/downloads")
export class DownloadsAdminController {
  constructor(private readonly downloads: DownloadsService) {}

  @Get()
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "List all downloads incl. drafts (paginated)" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("status") status?: PublishStatus,
    @Query("category") category?: DownloadCategory,
  ) {
    return this.downloads.listAdmin(
      query.page ?? 1,
      query.pageSize ?? 20,
      query.search,
      status,
      category,
    );
  }

  @Get(":id")
  @RequirePermissions("content.read")
  getById(@Param("id") id: string) {
    return this.downloads.getAdminById(id);
  }

  @Post()
  @RequirePermissions("content.write")
  create(@Body() dto: CreateDownloadDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.downloads.create(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("content.write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDownloadDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.downloads.update(id, dto, actor);
  }

  @Patch(":id/status")
  @RequirePermissions("content.publish")
  setStatus(
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.downloads.setStatus(id, dto.status, actor);
  }

  @Delete(":id")
  @RequirePermissions("content.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.downloads.remove(id, actor);
  }
}
