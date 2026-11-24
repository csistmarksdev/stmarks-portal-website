import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import {
  FELLOWSHIP_SLUGS,
  PUBLISH_STATUSES,
  VIDEO_PROVIDERS,
  type FellowshipSlug,
  type GalleryVideo,
  type PublishStatus,
} from "@portal/shared";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

import { ImageAssetDto } from "../../../common/dto/image-asset.dto";
import { SeoDto } from "../../../common/dto/seo.dto";
import {
  LocalizedTextDto,
  LocalizedTextOptionalDto,
} from "../../../common/dto/localized-text.dto";

export class GalleryVideoDto {
  @ApiProperty({
    description: "Direct mp4/webm file URL, or a YouTube/Vimeo link",
    example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({
    enum: VIDEO_PROVIDERS,
    description: "Inferred from the URL when omitted",
  })
  @IsOptional()
  @IsIn(VIDEO_PROVIDERS as readonly string[])
  provider?: GalleryVideo["provider"];
}

export class AddPhotoDto {
  @ApiProperty({
    type: ImageAssetDto,
    description: "The photograph, or the poster frame when `video` is set",
  })
  @ValidateNested()
  @Type(() => ImageAssetDto)
  image: ImageAssetDto;

  @ApiPropertyOptional({ type: LocalizedTextOptionalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextOptionalDto)
  caption?: LocalizedTextOptionalDto;

  @ApiPropertyOptional({
    type: GalleryVideoDto,
    description: "Set to make this item a video; `image` becomes its thumbnail",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GalleryVideoDto)
  video?: GalleryVideoDto;
}

export class CreateAlbumDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiProperty({ example: "2026-06-14", description: "Date the album's event took place" })
  @IsISO8601()
  date: string;

  @ApiProperty({ type: ImageAssetDto })
  @ValidateNested()
  @Type(() => ImageAssetDto)
  cover: ImageAssetDto;

  @ApiPropertyOptional({
    enum: FELLOWSHIP_SLUGS,
    description: "Leave unset on a shared, churchwide album",
  })
  @IsOptional()
  @IsIn(FELLOWSHIP_SLUGS as readonly string[])
  fellowshipSlug?: FellowshipSlug;

  @ApiPropertyOptional({
    default: false,
    description:
      "Churchwide album - appears in every fellowship's gallery (contract §5.3)",
  })
  @IsOptional()
  @IsBoolean()
  shared?: boolean;

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
    type: [AddPhotoDto],
    description:
      "Photos and videos to create the album with, in order. Later additions go through POST /:id/photos.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPhotoDto)
  photos?: AddPhotoDto[];

  @ApiPropertyOptional({
    example: "christmas-carol-service-2026",
    description:
      "SEO URL slug. Optional - generated from the English title when blank. " +
      "Cleaned to lowercase-with-dashes and made unique; fixed once the album is published.",
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ type: SeoDto, description: "Search-engine title, description and keywords" })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;
}

/*
 * `photos` is left out of updates on purpose: an edit replacing the whole
 * stream would discard items added meanwhile. The photo endpoints add, remove
 * and reorder individual items instead.
 */
/** An album item as an edit sends it: existing items keep their `id`. */
export class AlbumItemDto extends AddPhotoDto {
  @ApiPropertyOptional({ description: "Present for an item already in the album" })
  @IsOptional()
  @IsString()
  id?: string;
}

export class UpdateAlbumDto extends PartialType(OmitType(CreateAlbumDto, ["photos"] as const)) {
  /**
   * The whole photo stream - honoured only as part of the approval flow: an
   * editor's change to a live album carries its photos in the submission,
   * and an approver's save applies them. Anywhere else it is ignored; the
   * photo endpoints add, remove and reorder items one at a time.
   */
  @ApiPropertyOptional({ type: [AlbumItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlbumItemDto)
  photos?: AlbumItemDto[];

  @ApiPropertyOptional({ description: "Only changeable while the album is a draft" })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class AddPhotosDto {
  @ApiProperty({ type: [AddPhotoDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AddPhotoDto)
  photos: AddPhotoDto[];
}

export class ReorderPhotosDto {
  @ApiProperty({ type: [String], description: "Photo ids in the desired order" })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  photoIds: string[];
}
