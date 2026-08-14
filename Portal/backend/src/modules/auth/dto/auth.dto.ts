import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@csistmarksmadipakkam.org" })
  @IsEmail()
  email: string;

  /*
   * No minimum worth enforcing here — this checks an existing password, and a
   * length rule on the way in only tells an attacker which guesses are worth
   * making. The ceiling stays: bcrypt would otherwise hash a megabyte on every
   * unauthenticated attempt.
   */
  @ApiProperty({ example: "ChangeMe@123" })
  @IsString()
  @MaxLength(200)
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
