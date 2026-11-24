import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SEO_LIMITS, VIDEO_PROVIDERS, type GalleryVideo } from "@portal/shared";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUrl,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { ImageAssetDto } from "./image-asset.dto";
import { LocalizedTextOptionalDto } from "./localized-text.dto";

/**
 * Keywords as typed in the CMS: trimmed, lowercased, blanks dropped and
 * duplicates removed. A comma-separated string is accepted too.
 */
function cleanKeywords({ value }: { value: unknown }): unknown {
  if (value === null || value === undefined) return value;
  const list = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(list)) return value;
  const seen = new Set<string>();
  for (const item of list) {
    if (typeof item !== "string") return value; // let validation reject it
    const keyword = item.trim().replace(/\s+/g, " ").toLowerCase();
    if (keyword) seen.add(keyword);
  }
  return [...seen];
}

/** A share video: a YouTube/Vimeo link or a direct video file. */
export class SeoVideoDto {
  @ApiProperty({
    description: "YouTube or Vimeo link, or a direct mp4/webm file URL",
    example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({ enum: VIDEO_PROVIDERS, description: "Inferred from the URL when omitted" })
  @IsOptional()
  @IsIn(VIDEO_PROVIDERS as readonly string[])
  provider?: GalleryVideo["provider"];
}

/** Search-engine metadata for a record with its own public page. */
export class SeoDto {
  @ApiPropertyOptional({
    type: LocalizedTextOptionalDto,
    description: `<title> / og:title. Falls back to the record's title. ~${SEO_LIMITS.title} characters.`,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextOptionalDto)
  title?: LocalizedTextOptionalDto;

  @ApiPropertyOptional({
    type: LocalizedTextOptionalDto,
    description: `Meta description. Falls back to the summary/excerpt. ~${SEO_LIMITS.description} characters.`,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextOptionalDto)
  description?: LocalizedTextOptionalDto;

  @ApiPropertyOptional({
    type: [String],
    example: ["christmas", "carol service", "csi st mark's church"],
    description: `Meta keywords; up to ${SEO_LIMITS.keywords}, cleaned to lowercase and de-duplicated.`,
  })
  @IsOptional()
  @Transform(cleanKeywords)
  @IsArray()
  @ArrayMaxSize(SEO_LIMITS.keywords)
  @IsString({ each: true })
  @MaxLength(SEO_LIMITS.keywordLength, { each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    type: ImageAssetDto,
    description: "Share image (og:image). Falls back to the record's cover/image.",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageAssetDto)
  image?: ImageAssetDto;

  @ApiPropertyOptional({
    type: SeoVideoDto,
    description: "Share video (og:video, VideoObject structured data)",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoVideoDto)
  video?: SeoVideoDto;
}
