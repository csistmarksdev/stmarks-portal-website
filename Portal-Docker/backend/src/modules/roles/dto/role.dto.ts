import { ApiProperty, PartialType } from "@nestjs/swagger";
import { ALL_PERMISSIONS, type Permission } from "@portal/shared";
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateRoleDto {
  @ApiProperty({ example: "Youth leader" })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiProperty({ required: false, example: "Posts youth events and their photos." })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ enum: ALL_PERMISSIONS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS as readonly string[], { each: true })
  permissions: Permission[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
