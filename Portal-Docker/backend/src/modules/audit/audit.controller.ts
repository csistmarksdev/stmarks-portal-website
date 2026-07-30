import { Controller, Delete, Get, Ip, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuditAction } from "@portal/shared";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { AuditService } from "./audit.service";
import { PurgeAuditDto } from "./dto/purge-audit.dto";

@ApiTags("Admin — Audit")
@ApiBearerAuth()
@Controller("admin/audit-logs")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions("audit.read")
  @ApiOperation({ summary: "List audit log entries (newest first, paginated)" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("action") action?: AuditAction,
    @Query("resource") resource?: string,
    @Query("userId") userId?: string,
  ) {
    return this.audit.list({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      action,
      resource,
      userId,
    });
  }

  /*
   * Guarded by `audit.delete`, not `audit.read`. Reading the log is broad —
   * even a viewer has it — while clearing it removes the record of what
   * everyone did, so only a super-admin holds the delete permission.
   */
  @Delete()
  @RequirePermissions("audit.delete")
  @ApiOperation({
    summary: "Purge audit history older than N days (0 clears all)",
  })
  purge(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() dto: PurgeAuditDto,
    @Ip() ip: string,
  ) {
    return this.audit.purge(actor, dto.olderThanDays ?? 90, ip);
  }
}
