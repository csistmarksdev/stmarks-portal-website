import { ApiProperty } from "@nestjs/swagger";
import { USER_ROLES, type UserRole } from "@portal/shared";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "Jane Editor" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: "jane@csistmarksmadipakkam.org" })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: USER_ROLES })
  @IsIn(USER_ROLES as readonly string[])
  role: UserRole;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
