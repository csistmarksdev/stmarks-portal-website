import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { ImageAssetDto } from "../../../common/dto/image-asset.dto";
import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

/**
 * Church singletons the CMS owns.
 *
 * The profile, history, vision & mission, diocese and hero slides are
 * hardcoded in the Website — they are written once and edited years apart, so
 * they were removed from the Portal rather than kept as forms nobody opens.
 */

/* ----------------------------- Service timings ---------------------------- */

export class ServiceTimingDto {
  @ApiPropertyOptional({ description: "Stable id; generated when omitted" })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  day: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  time: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  service: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  venue: LocalizedTextDto;
}

export class ServiceTimingsDto {
  @ApiProperty({ type: [ServiceTimingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceTimingDto)
  items: ServiceTimingDto[];
}

/* ------------------------------ Pastor message ----------------------------- */

export class PastorMessageDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  authorName: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  authorRole: LocalizedTextDto;

  @ApiPropertyOptional({ type: ImageAssetDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageAssetDto)
  authorImage?: ImageAssetDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  excerpt: LocalizedTextDto;

  @ApiProperty({ type: [LocalizedTextDto], description: "Ordered paragraphs" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalizedTextDto)
  body: LocalizedTextDto[];
}

/* -------------------------------- Weekly verse ----------------------------- */

export class WeeklyVerseDto {
  @ApiProperty({ type: LocalizedTextDto, example: { en: "John 3:16", ta: "யோவான் 3:16" } })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  reference: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  text: LocalizedTextDto;

  @ApiProperty({ example: "2026-07-20", description: "ISO date of the verse's week" })
  @IsISO8601()
  weekOf: string;
}
