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
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { ImageAssetDto } from "../../../common/dto/image-asset.dto";
import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

export class CreateBlogPostDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  excerpt: LocalizedTextDto;

  @ApiProperty({ type: [LocalizedTextDto], description: "Ordered paragraphs" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  body: LocalizedTextDto[];

  @ApiProperty({ example: "2026-07-01" })
  @IsISO8601()
  publishedAt: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  author: LocalizedTextDto;

  @ApiPropertyOptional({ type: ImageAssetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageAssetDto)
  coverImage?: ImageAssetDto;

  @ApiPropertyOptional({ description: "Slug of the event this post reports on" })
  @IsOptional()
  @IsString()
  eventSlug?: string;

  @ApiPropertyOptional({ enum: FELLOWSHIP_SLUGS })
  @IsOptional()
  @IsIn(FELLOWSHIP_SLUGS as readonly string[])
  fellowshipSlug?: FellowshipSlug;

  @ApiPropertyOptional({ enum: PUBLISH_STATUSES, default: "draft" })
  @IsOptional()
  @IsIn(PUBLISH_STATUSES as readonly string[])
  status?: PublishStatus;
}

export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {
  @ApiPropertyOptional({ description: "Only changeable while the post is a draft" })
  @IsOptional()
  @IsString()
  slug?: string;
}
