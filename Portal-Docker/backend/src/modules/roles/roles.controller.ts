import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { RolesService } from "./roles.service";

@ApiTags("Admin: Roles")
@ApiBearerAuth()
@Controller("admin/roles")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /*
   * Any signed-in user may read the role list: it names roles and what they
   * allow, nothing about who holds them beyond a count, and the Users page and
   * Roles page both need it.
   */
  @Get()
  @ApiOperation({ summary: "List built-in and custom roles with their permissions" })
  list() {
    return this.roles.list();
  }

  @Post()
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Create a custom role" })
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.roles.create(dto, actor);
  }

  @Patch(":key")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Rename a custom role or change what it allows" })
  update(
    @Param("key") key: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.roles.update(key, dto, actor);
  }

  @Delete(":key")
  @RequirePermissions("roles.write")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a custom role nobody holds" })
  async remove(@Param("key") key: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.roles.remove(key, actor);
  }
}
