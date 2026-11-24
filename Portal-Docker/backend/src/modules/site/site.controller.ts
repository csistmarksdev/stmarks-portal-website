import { Body, Controller, Get, Header, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { UpdateMaintenanceDto } from "./dto/maintenance.dto";
import { SiteService } from "./site.service";

/** Public: whether the website should show its maintenance notice. */
@ApiTags("Public: Site")
@Public()
@Controller("site")
export class SitePublicController {
  constructor(private readonly site: SiteService) {}

  @Get("status")
  // Never cached: switching maintenance off must take effect at once.
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Maintenance mode and its visitor-facing message" })
  status() {
    return this.site.status();
  }
}

@ApiTags("Admin: Site")
@ApiBearerAuth()
@Controller("admin/site")
export class SiteAdminController {
  constructor(private readonly site: SiteService) {}

  /* Anyone signed in may see whether the site is in maintenance (the CMS shows a banner). */
  @Get("maintenance")
  get() {
    return this.site.maintenanceAdmin();
  }

  @Put("maintenance")
  @RequirePermissions("site.maintenance")
  @ApiOperation({ summary: "Switch maintenance mode on or off, and set its message" })
  set(@Body() dto: UpdateMaintenanceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.site.setMaintenance(dto, actor);
  }
}
