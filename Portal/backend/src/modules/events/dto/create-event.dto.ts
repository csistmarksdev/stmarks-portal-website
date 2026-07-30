import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipSlug,
  type PublishStatus,
} from "@portal/shared";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { ImageAssetDto } from "../../../common/dto/image-asset.dto";
import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

export class CreateEventDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  summary: LocalizedTextDto;

  @ApiProperty({ type: [LocalizedTextDto], description: "Ordered paragraphs" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto[];

  @ApiProperty({ example: "2026-12-24T18:00:00.000Z" })
  @IsISO8601()
  startDate: string;

  @ApiPropertyOptional({ example: "2026-12-24T21:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  location: LocalizedTextDto;

  @ApiPropertyOptional({ type: ImageAssetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageAssetDto)
  image?: ImageAssetDto;

  @ApiPropertyOptional({ enum: FELLOWSHIP_SLUGS })
  @IsOptional()
  @IsIn(FELLOWSHIP_SLUGS as readonly string[])
  fellowshipSlug?: FellowshipSlug;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  organiser?: LocalizedTextDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: PUBLISH_STATUSES, default: "draft" })
  @IsOptional()
  @IsIn(PUBLISH_STATUSES as readonly string[])
  status?: PublishStatus;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({ description: "Only changeable while the event is a draft" })
  @IsOptional()
  @IsString()
  slug?: string;
}
