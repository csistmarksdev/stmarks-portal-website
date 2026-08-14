import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
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
import { RESTORE_MODES, type RestoreMode } from "@portal/shared";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import type { Request, Response } from "express";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user";
import { BACKUP_WORK_DIR, BackupService } from "./backup.service";

/**
 * Ceiling on an uploaded archive.
 *
 * Read from the raw environment because decorators are evaluated at import
 * time, before the config module has parsed `.env` — the same reason
 * `MediaController` does it. Generous by default: a backup is every video the
 * church has ever uploaded, and a limit that rejects an installation's own
 * backup would make the feature useless exactly when it is needed.
 */
const MAX_RESTORE_BYTES = Number(process.env.MAX_BACKUP_UPLOAD_MB ?? 4096) * 1024 * 1024;

export class UploadBackupDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: unknown;
}

export class ApplyRestoreDto {
  @ApiProperty({
    enum: RESTORE_MODES,
    description:
      "`replace` empties each collection in the archive before inserting (a true rollback); " +
      "`merge` upserts by _id and deletes nothing.",
  })
  @IsIn(RESTORE_MODES as readonly string[])
  mode: RestoreMode;

  @ApiProperty({
    required: false,
    default: true,
    description: "Take a downloadable backup of the current data before restoring.",
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value !== false && value !== "false")
  safetyBackup?: boolean;
}

@ApiTags("Admin — Backup & restore")
@ApiBearerAuth()
@Controller("admin/backup")
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Get("preview")
  @RequirePermissions("backup.read")
  @ApiOperation({ summary: "What a backup taken right now would contain" })
  preview() {
    return this.backup.preview();
  }

  @Post()
  @RequirePermissions("backup.read")
  @HttpCode(201)
  @ApiOperation({
    summary:
      "Build a complete archive — every collection plus the media library — and return a ticket to download it",
  })
  create(@CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.backup.create(actor, request.ip);
  }

  /**
   * Streams a built archive.
   *
   * Unauthenticated, and deliberately so. A browser download is a navigation:
   * it cannot carry the `Authorization` header the rest of this API is built
   * on, and the alternative — fetching the archive into memory in JavaScript
   * and handing the user a blob — puts a multi-gigabyte file in the tab's heap
   * to save nothing.
   *
   * What stands in for the header is the ticket: an unguessable 256-bit token
   * that only the request which created the backup ever saw, is checked in
   * constant time, expires in half an hour, and refers to one archive. The
   * conventional signed-URL trade, made explicitly rather than by accident.
   */
  @Get(":id/download")
  @Public()
  @ApiOperation({ summary: "Download a built archive using its one-time ticket token" })
  download(
    @Param("id") id: string,
    @Query("token") token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { path, filename, sizeBytes } = this.backup.claim(id, token);

    /*
     * `setHeader`, not Express's `res.set`, which appends `charset=utf-8` to
     * any content type it is handed. A character encoding on a zip is
     * meaningless, and some clients take it as a hint to transcode.
     */
    response.setHeader("Content-Length", String(sizeBytes));
    // The archive holds password hashes and the contact inbox. Nothing about it
    // should ever sit in a proxy or the browser's disk cache.
    response.setHeader("Cache-Control", "no-store, private");

    /*
     * `StreamableFile`, not a bare `ReadStream`. Nest only recognises the
     * former as something to pipe; returning the stream itself sends it to the
     * JSON serialiser, which produces a 200 with a few bytes of `{}` in it —
     * a "successful" download of a corrupt archive.
     */
    return new StreamableFile(createReadStream(path), {
      type: "application/zip",
      disposition: `attachment; filename="${filename}"`,
    });
  }

  /**
   * Accepts an archive and reports what is in it, without applying anything.
   *
   * Two steps rather than one because a restore cannot be undone: the CMS
   * shows the manifest — when the backup was taken, from where, how much of it
   * there is — and only then offers the button.
   */
  @Post("restore")
  @RequirePermissions("backup.restore")
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_request, _file, callback) => callback(null, BACKUP_WORK_DIR),
        // The client's filename is never used to name anything on disk.
        filename: (_request, _file, callback) => callback(null, `${randomUUID()}.upload.zip`),
      }),
      limits: { fileSize: MAX_RESTORE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UploadBackupDto })
  @ApiOperation({ summary: "Upload a backup archive and inspect it (nothing is written yet)" })
  async stage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException("No archive was uploaded");
    return this.backup.stage(file.path, actor);
  }

  @Post("restore/:id")
  @RequirePermissions("backup.restore")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Apply a staged archive. Destructive in `replace` mode — every collection in the archive is emptied first.",
  })
  apply(
    @Param("id") id: string,
    @Body() dto: ApplyRestoreDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.backup.apply(id, dto.mode, dto.safetyBackup ?? true, actor, request.ip);
  }
}
