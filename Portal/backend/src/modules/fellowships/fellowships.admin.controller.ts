import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { SetStatusDto } from "../../common/dto/set-status.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import {
  CreateFellowshipDto,
  UpdateFellowshipDto,
} from "./dto/fellowship.dto";
import { FellowshipsService } from "./fellowships.service";

@ApiTags("Admin — Fellowships")
@ApiBearerAuth()
@Controller("admin/fellowships")
export class FellowshipsAdminController {
  constructor(private readonly fellowships: FellowshipsService) {}

  @Get()
  @RequirePermissions("content.read")
  @ApiOperation({ summary: "All fellowships incl. unpublished" })
  list() {
    return this.fellowships.listAdmin();
  }

  @Get(":id")
  @RequirePermissions("content.read")
  getById(@Param("id") id: string) {
    return this.fellowships.getAdminById(id);
  }

  @Post()
  @RequirePermissions("content.write")
  @ApiOperation({ summary: "Create a fellowship (slug from the fixed enum)" })
  create(
    @Body() dto: CreateFellowshipDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.fellowships.create(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("content.write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateFellowshipDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.fellowships.update(id, dto, actor);
  }

  @Patch(":id/status")
  @RequirePermissions("content.publish")
  setStatus(
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.fellowships.setStatus(id, dto.status, actor);
  }

  @Delete(":id")
  @RequirePermissions("content.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.fellowships.remove(id, actor);
  }
}
