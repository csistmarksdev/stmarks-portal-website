import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipSlug,
  type PublishStatus,
} from "@portal/shared";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

export class CreateAnnouncementDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  body: LocalizedTextDto;

  @ApiProperty({ example: "2026-07-20" })
  @IsISO8601()
  publishedAt: string;

  @ApiPropertyOptional({ default: false, description: "Only one announcement is pinned at a time" })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ enum: FELLOWSHIP_SLUGS })
  @IsOptional()
  @IsIn(FELLOWSHIP_SLUGS as readonly string[])
  fellowshipSlug?: FellowshipSlug;

  @ApiPropertyOptional({ enum: PUBLISH_STATUSES, default: "draft" })
  @IsOptional()
  @IsIn(PUBLISH_STATUSES as readonly string[])
  status?: PublishStatus;

  @ApiPropertyOptional({
    nullable: true,
    example: "2026-12-01T00:00:00.000Z",
    description: "Not public before this instant. null clears it.",
  })
  @IsOptional()
  @IsISO8601()
  publishAt?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: "2026-12-31T18:30:00.000Z",
    description: "Not public from this instant on. null clears it.",
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;

  @ApiPropertyOptional({
    example: "christmas-carol-service-2026",
    description:
      "SEO URL slug. Optional - generated from the English title when blank. " +
      "Cleaned to lowercase-with-dashes and made unique; fixed once the announcement is published.",
  })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {
  @ApiPropertyOptional({ description: "Only changeable while the announcement is a draft" })
  @IsOptional()
  @IsString()
  slug?: string;
}
