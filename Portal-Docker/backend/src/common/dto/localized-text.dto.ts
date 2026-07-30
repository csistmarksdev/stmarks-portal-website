import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * `LocalizedText` — every translatable content field carries both languages.
 * The Website does not fall back when a language is missing, so both are
 * required (empty string is allowed but discouraged; the CMS warns on it).
 */
export class LocalizedTextDto {
  @ApiProperty({ example: "Christmas Carol Service" })
  @IsString()
  en: string;

  @ApiProperty({ example: "கிறிஸ்துமஸ் கீத ஆராதனை" })
  @IsString()
  ta: string;
}

/** Optional-per-language variant (e.g. gallery photo captions). */
export class LocalizedTextOptionalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ta?: string;
}
