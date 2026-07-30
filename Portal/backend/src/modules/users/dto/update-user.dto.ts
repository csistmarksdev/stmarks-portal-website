import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

import { CreateUserDto } from "./create-user.dto";

/** Password changes go through their own endpoint; all else optional. */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["password"] as const),
) {}

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
