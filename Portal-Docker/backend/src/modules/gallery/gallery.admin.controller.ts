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
import {
  AddPhotosDto,
  CreateAlbumDto,
  ReorderPhotosDto,
  UpdateAlbumDto,
} from "./dto/gallery.dto";
import { GalleryService } from "./gallery.service";

@ApiTags("Admin — Gallery")
@ApiBearerAuth()
@Controller("admin/gallery")
export class GalleryAdminController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "List all albums incl. drafts (paginated)" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("status") status?: PublishStatus,
  ) {
    return this.gallery.listAdmin(
      query.page ?? 1,
      query.pageSize ?? 20,
      query.search,
      status,
    );
  }

  @Get(":id")
  @RequirePermissions("content.read")
  getById(@Param("id") id: string) {
    return this.gallery.getAdminById(id);
  }

  @Post()
  @RequirePermissions("content.write")
  create(@Body() dto: CreateAlbumDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.gallery.create(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("content.write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAlbumDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.gallery.update(id, dto, actor);
  }

  @Patch(":id/status")
  @RequirePermissions("content.publish")
  setStatus(
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.gallery.setStatus(id, dto.status, actor);
  }

  @Delete(":id")
  @RequirePermissions("content.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.gallery.remove(id, actor);
  }

  /* ------------------------------ Photos ---------------------------------- */

  @Post(":id/photos")
  @RequirePermissions("content.write")
  @ApiOperation({ summary: "Append photos to an album" })
  addPhotos(
    @Param("id") id: string,
    @Body() dto: AddPhotosDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.gallery.addPhotos(id, dto, actor);
  }

  @Patch(":id/photos/reorder")
  @RequirePermissions("content.write")
  @ApiOperation({ summary: "Reorder an album's photos" })
  reorderPhotos(
    @Param("id") id: string,
    @Body() dto: ReorderPhotosDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.gallery.reorderPhotos(id, dto, actor);
  }

  @Delete(":id/photos/:photoId")
  @RequirePermissions("content.write")
  @ApiOperation({ summary: "Remove one photo from an album" })
  removePhoto(
    @Param("id") id: string,
    @Param("photoId") photoId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.gallery.removePhoto(id, photoId, actor);
  }
}
