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

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { CreateUserDto } from "./dto/create-user.dto";
import { ChangePasswordDto, UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("Admin — Users")
@ApiBearerAuth()
@Controller("admin/users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "List admin users (paginated)" })
  list(@Query() query: PaginationQueryDto) {
    return this.users.list(query.page ?? 1, query.pageSize ?? 20, query.search);
  }

  @Get(":id")
  @RequirePermissions("users.read")
  getById(@Param("id") id: string) {
    return this.users.getById(id);
  }

  @Post()
  @RequirePermissions("users.write")
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create(dto, actor);
  }

  @Patch(":id")
  @RequirePermissions("users.write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.update(id, dto, actor);
  }

  @Patch(":id/password")
  @RequirePermissions("users.write")
  @HttpCode(204)
  async changePassword(
    @Param("id") id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.users.changePassword(id, dto.password, actor);
  }

  @Delete(":id")
  @RequirePermissions("users.write")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.users.remove(id, actor);
  }
}
