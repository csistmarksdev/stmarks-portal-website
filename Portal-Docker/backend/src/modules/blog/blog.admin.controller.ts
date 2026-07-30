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
import { CreateBlogPostDto, UpdateBlogPostDto } from "./dto/create-blog-post.dto";
import { BlogService } from "./blog.service";

@ApiTags("Admin — Blog")
@ApiBearerAuth()
@Controller("admin/blog")
export class BlogAdminController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "List all blog posts incl. drafts (paginated)" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("status") status?: PublishStatus,
  ) {
    return this.blog.listAdmin(
      query.page ?? 1,
      query.pageSize ?? 20,
      query.search,
      status,
    );
  }

  @Get(":id")
  @RequirePermissions("content.read")
  getById(@Param("id") id: string) {
    return this.blog.getAdminById(id);
  }

  @Post()
  @RequirePermissions("content.write")
  create(@Body() dto: CreateBlogPostDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.blog.create(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("content.write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.blog.update(id, dto, actor);
  }

  @Patch(":id/status")
  @RequirePermissions("content.publish")
  setStatus(
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.blog.setStatus(id, dto.status, actor);
  }

  @Delete(":id")
  @RequirePermissions("content.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.blog.remove(id, actor);
  }
}
