import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@csistmarksmadipakkam.org" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "ChangeMe@123" })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

/** Self-service profile edit. Email and role stay administrator-managed. */
export class UpdateProfileDto {
  @ApiProperty({ example: "Pavun Sangeetha", minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;
}

/**
 * Self-service password change.
 *
 * The current password is required even though the caller is already
 * authenticated: a borrowed or stolen session should not be enough to lock the
 * real owner out of their own account. `users.write` deliberately is *not*
 * required — only a super-admin holds it, so without this every other role had
 * to ask an administrator to change their password for them.
 */
export class ChangeOwnPasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 12, description: "At least 12 characters" })
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  newPassword: string;
}
