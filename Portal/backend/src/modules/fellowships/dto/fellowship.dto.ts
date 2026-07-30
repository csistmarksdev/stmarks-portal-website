import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  type FellowshipSlug,
  type PublishStatus,
} from "@portal/shared";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

import { ImageAssetDto } from "../../../common/dto/image-asset.dto";
import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

export class CommitteeMemberDto {
  @ApiPropertyOptional({ description: "Stable id; generated when omitted" })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  designation: LocalizedTextDto;

  @ApiPropertyOptional({ type: ImageAssetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageAssetDto)
  image?: ImageAssetDto;
}

export class CoordinatorDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateFellowshipDto {
  @ApiProperty({ enum: FELLOWSHIP_SLUGS, description: "Fixed enum — Website routes depend on it" })
  @IsIn(FELLOWSHIP_SLUGS as readonly string[])
  slug: FellowshipSlug;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  tagline: LocalizedTextDto;

  @ApiProperty({ type: [LocalizedTextDto], description: "Ordered paragraphs" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  about: LocalizedTextDto[];

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  vision: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  schedule: LocalizedTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  memberCount?: number;

  @ApiProperty({ type: ImageAssetDto })
  @ValidateNested()
  @Type(() => ImageAssetDto)
  banner: ImageAssetDto;

  @ApiProperty({ type: [CommitteeMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitteeMemberDto)
  committee: CommitteeMemberDto[];

  @ApiProperty({ type: CoordinatorDto })
  @ValidateNested()
  @Type(() => CoordinatorDto)
  coordinator: CoordinatorDto;

  @ApiProperty({ description: "Display order on the fellowships page" })
  @IsInt()
  order: number;

  @ApiPropertyOptional({ enum: PUBLISH_STATUSES, default: "published" })
  @IsOptional()
  @IsIn(PUBLISH_STATUSES as readonly string[])
  status?: PublishStatus;
}

/** Slug is the identity of a fellowship — it can never change. */
export class UpdateFellowshipDto extends PartialType(
  OmitType(CreateFellowshipDto, ["slug"] as const),
) {}
