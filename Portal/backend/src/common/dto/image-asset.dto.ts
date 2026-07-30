import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from "class-validator";

import { LocalizedTextDto } from "./localized-text.dto";

export class ImageAssetDto {
  @ApiProperty({ example: "http://localhost:4000/uploads/images/abc.jpg" })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  alt: LocalizedTextDto;

  @ApiProperty({ example: 1600 })
  @IsInt()
  @Min(1)
  width: number;

  @ApiProperty({ example: 900 })
  @IsInt()
  @Min(1)
  height: number;

  @ApiPropertyOptional({ description: "Tiny base64 preview" })
  @IsOptional()
  @IsString()
  blurDataURL?: string;
}
