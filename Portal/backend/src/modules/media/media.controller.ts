import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import type { MediaKind } from "@portal/shared";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { LocalizedTextDto } from "../../common/dto/localized-text.dto";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { MediaService } from "./media.service";

/**
 * Coarse guard only. Decorators are evaluated at import time, before the
 * config module has read `.env`, so this reads the raw environment and errs
 * generous — `MediaService` then applies the exact per-kind limit (a 15 MB
 * image ceiling would otherwise reject every video before it was inspected).
 */
const HARD_UPLOAD_CEILING =
  Number(process.env.MAX_VIDEO_UPLOAD_MB ?? 200) * 1024 * 1024;

export class UploadMediaDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: unknown;

  @ApiProperty({ required: false, description: "English alt text (images)" })
  @IsOptional()
  @IsString()
  altEn?: string;

  @ApiProperty({ required: false, description: "Tamil alt text (images)" })
  @IsOptional()
  @IsString()
  altTa?: string;
}

export class UpdateAltDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  alt: LocalizedTextDto;
}

export class VideoPosterDto {
  @ApiProperty({
    description: "A YouTube or Vimeo link whose thumbnail becomes the poster",
    example: "https://youtu.be/dQw4w9WgXcQ",
  })
  @IsString()
  url: string;
}

@ApiTags("Admin — Media library")
@ApiBearerAuth()
@Controller("admin/media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @RequirePermissions("media.write")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UploadMediaDto })
  @ApiOperation({
    summary:
      "Upload an image / video / PDF / document — images also return dimensions, a thumbnail and blurDataURL",
  })
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: HARD_UPLOAD_CEILING })],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.media.upload(file, { en: dto.altEn, ta: dto.altTa }, actor);
  }

  @Post("video-poster")
  @RequirePermissions("media.write")
  @HttpCode(201)
  @ApiOperation({
    summary:
      "Fetch a YouTube/Vimeo thumbnail into the library and return it as a poster image (422 when none can be had)",
  })
  videoPoster(
    @Body() dto: VideoPosterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.media.createPosterFromVideoUrl(dto.url, actor);
  }

  @Get()
  @RequirePermissions("media.read")
  @ApiOperation({ summary: "Browse the media library (paginated)" })
  list(
    @Query() query: PaginationQueryDto,
    @Query("kind") kind?: MediaKind,
  ) {
    return this.media.list(
      query.page ?? 1,
      query.pageSize ?? 24,
      kind,
      query.search,
    );
  }

  @Get(":id")
  @RequirePermissions("media.read")
  getById(@Param("id") id: string) {
    return this.media.getById(id);
  }

  @Patch(":id")
  @RequirePermissions("media.write")
  @ApiOperation({ summary: "Update alt text" })
  updateAlt(
    @Param("id") id: string,
    @Body() dto: UpdateAltDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.media.updateAlt(id, dto.alt, actor);
  }

  @Delete(":id")
  @RequirePermissions("media.delete")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    await this.media.remove(id, actor);
  }
}
