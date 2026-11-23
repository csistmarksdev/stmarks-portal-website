import { ApiProperty } from "@nestjs/swagger";
import type { RoleKey } from "@portal/shared";
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
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

  /*
   * Twelve, matching the self-service change and what the CMS has always told
   * people. This was eight, so the account an administrator created for someone
   * could be weaker than the password that person was later allowed to set —
   * and the weaker one is the one that exists on day one.
   *
   * The ceiling is not decoration: bcrypt hashes whatever it is handed, and an
   * unbounded field turns account creation into a way to spend the server's CPU.
   */
  @ApiProperty({ minLength: 12, maxLength: 200 })
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password: string;

  /** A built-in role or a custom role's key; the service checks it exists. */
  @ApiProperty({ example: "editor" })
  @IsString()
  @MaxLength(64)
  role: RoleKey;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
