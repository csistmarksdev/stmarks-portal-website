import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

import { CreateUserDto } from "./create-user.dto";

/** Password changes go through their own endpoint; all else optional. */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["password"] as const),
) {}

export class ChangePasswordDto {
  /** Same floor as everywhere else — see `CreateUserDto`. */
  @ApiProperty({ minLength: 12, maxLength: 200 })
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password: string;
}
