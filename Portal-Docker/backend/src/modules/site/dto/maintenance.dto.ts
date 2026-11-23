import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsISO8601, IsOptional, ValidateNested } from "class-validator";

import { LocalizedTextDto } from "../../../common/dto/localized-text.dto";

export class UpdateMaintenanceDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  message: LocalizedTextDto;

  @ApiPropertyOptional({
    nullable: true,
    description: "When the site is expected back. null clears it.",
  })
  @IsOptional()
  @IsISO8601()
  until?: string | null;
}
