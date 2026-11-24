import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { NotificationsService } from "./notifications.service";

/* Every signed-in account has its own notifications; no permission needed. */
@ApiTags("Admin: Notifications")
@ApiBearerAuth()
@Controller("admin/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Your notifications, newest first" })
  list(@CurrentUser() me: AuthenticatedUser, @Query("limit") limit?: string) {
    return this.notifications.list(me, limit ? Number(limit) || 50 : 50);
  }

  @Get("unread")
  unread(@CurrentUser() me: AuthenticatedUser) {
    return this.notifications.unread(me);
  }

  @Post("read-all")
  @HttpCode(204)
  async readAll(@CurrentUser() me: AuthenticatedUser) {
    await this.notifications.markAllRead(me);
  }

  @Post(":id/read")
  @HttpCode(204)
  async read(@Param("id") id: string, @CurrentUser() me: AuthenticatedUser) {
    await this.notifications.markRead(id, me);
  }
}
