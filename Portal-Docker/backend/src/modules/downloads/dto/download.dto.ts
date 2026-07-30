import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  DOWNLOAD_CATEGORIES,
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type DownloadCategory,
  type FellowshipSlug,
  type PublishStatus,
} from "@portal/shared";
import { Type } from "class-transformer";
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

export class CreateDownloadDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiProperty({ enum: DOWNLOAD_CATEGORIES })
  @IsIn(DOWNLOAD_CATEGORIES as readonly string[])
  category: DownloadCategory;

  @ApiProperty({ description: "Direct file URL from the media library" })
  @IsUrl({ require_tld: false })
  fileUrl: string;

  @ApiProperty({ example: "PDF", description: "Uppercase extension (media library provides it)" })
  @IsString()
  format: string;

  @ApiProperty({ example: "1.2 MB", description: "Human-readable size (media library provides it)" })
  @IsString()
  size: string;

  @ApiProperty({ example: "2026-07-20" })
  @IsISO8601()
  publishedAt: string;

  @ApiPropertyOptional({ enum: FELLOWSHIP_SLUGS })
  @IsOptional()
  @IsIn(FELLOWSHIP_SLUGS as readonly string[])
  fellowshipSlug?: FellowshipSlug;

  @ApiPropertyOptional({ enum: PUBLISH_STATUSES, default: "draft" })
  @IsOptional()
  @IsIn(PUBLISH_STATUSES as readonly string[])
  status?: PublishStatus;
}

export class UpdateDownloadDto extends PartialType(CreateDownloadDto) {
  @ApiPropertyOptional({ description: "Only changeable while the download is a draft" })
  @IsOptional()
  @IsString()
  slug?: string;
}
