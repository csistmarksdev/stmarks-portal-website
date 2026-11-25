import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";

import { ImageAssetDto } from "../../../common/dto/image-asset.dto";
import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

/**
 * Church singletons the CMS owns.
 *
 * The profile, history, vision & mission, diocese and hero slides are
 * hardcoded in the Website - they are written once and edited years apart, so
 * they were removed from the Portal rather than kept as forms nobody opens.
 */

/* ----------------------------- Service timings ---------------------------- */

/** 24-hour clock time, "HH:mm" - what `<input type="time">` produces. */
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

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

  @ApiPropertyOptional({ description: 'Start, 24-hour "HH:mm"', example: "06:00" })
  @IsOptional()
  @Matches(CLOCK, { message: 'startTime must be a 24-hour time, "HH:mm"' })
  startTime?: string;

  @ApiPropertyOptional({ description: 'End, 24-hour "HH:mm"', example: "07:30" })
  @IsOptional()
  @Matches(CLOCK, { message: 'endTime must be a 24-hour time, "HH:mm"' })
  endTime?: string;

  @ApiPropertyOptional({ description: "Pinned in the homepage hero" })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    description: "Weeks of the month: 1-5 for the nth, -1 for the last; empty for every week",
    type: [Number],
    example: [1, 3],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([1, 2, 3, 4, 5, -1], { each: true })
  weeks?: number[];

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
