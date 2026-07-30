import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * How much audit history to remove.
 *
 * Expressed as a retention window rather than a list of ids: the useful
 * operation is "stop keeping years of this", not "make one particular action
 * disappear" — and the latter is exactly what an audit trail exists to prevent.
 *
 * `0` clears everything, and has to be asked for explicitly.
 */
export class PurgeAuditDto {
  @ApiPropertyOptional({
    default: 90,
    minimum: 0,
    maximum: 3650,
    description: "Delete entries older than this many days. 0 deletes all.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  olderThanDays?: number;
}
