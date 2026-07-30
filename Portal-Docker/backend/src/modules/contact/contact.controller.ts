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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsBoolean } from "class-validator";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { ContactFormDto } from "./dto/contact.dto";
import { ContactService } from "./contact.service";

export class SetReadDto {
  @ApiProperty()
  @IsBoolean()
  read: boolean;
}

@ApiTags("Public — Contact")
@Controller("contact")
export class ContactPublicController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  @HttpCode(200)
  // Spam protection (§5.9): 3 submissions per minute per IP.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Submit the contact form → { success, messageKey }" })
  submit(@Body() dto: ContactFormDto) {
    return this.contact.submit(dto);
  }
}

@ApiTags("Admin — Contact inbox")
@ApiBearerAuth()
@Controller("admin/contact-messages")
export class ContactAdminController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  @RequirePermissions("contact.read")
  @ApiOperation({ summary: "Contact form submissions, newest first" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("unread") unread?: string,
  ) {
    return this.contact.list(
      query.page ?? 1,
      query.pageSize ?? 20,
      unread === "true",
    );
  }

  @Patch(":id/read")
  @RequirePermissions("contact.read")
  setRead(@Param("id") id: string, @Body() dto: SetReadDto) {
    return this.contact.setRead(id, dto.read);
  }

  @Delete(":id")
  @RequirePermissions("content.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.contact.remove(id, actor);
  }
}
