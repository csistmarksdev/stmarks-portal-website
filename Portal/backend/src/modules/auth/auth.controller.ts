import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import {
  ChangeOwnPasswordDto,
  LoginDto,
  RefreshDto,
  UpdateProfileDto,
} from "./dto/auth.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Sign in with email + password" })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.auth.login(dto.email, dto.password, ip);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Rotate the refresh token, get a new token pair" })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current session's refresh token" })
  async logout(@CurrentUser() actor: AuthenticatedUser, @Ip() ip: string) {
    await this.auth.logout(actor, ip);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current authenticated user" })
  me(@CurrentUser() actor: AuthenticatedUser) {
    return this.users.getById(actor.userId);
  }

  /*
   * Self-service, deliberately on `/auth` rather than `/admin/users`.
   *
   * The admin routes require `users.write`, which only a super-admin holds — so
   * an editor could not change their own name or password without asking
   * someone else to do it for them. These act only on the caller's own record,
   * so they need authentication and nothing more.
   */

  @Patch("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update your own display name" })
  async updateMe(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
    @Ip() ip: string,
  ) {
    await this.auth.updateOwnProfile(actor, dto.name.trim(), ip);
    return this.users.getById(actor.userId);
  }

  @Post("change-password")
  @HttpCode(204)
  // Tighter than the default: this endpoint takes a password guess, so it is
  // worth rate-limiting the same way sign-in is.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Change your own password (requires the current one)",
  })
  async changeOwnPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangeOwnPasswordDto,
    @Ip() ip: string,
  ) {
    await this.auth.changeOwnPassword(
      actor,
      dto.currentPassword,
      dto.newPassword,
      ip,
    );
  }
}
