import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CHAT_MESSAGE_MAX } from "@portal/shared";
import { Type } from "class-transformer";
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class OpenConversationDto {
  @ApiProperty({ description: "The account to talk to" })
  @IsString()
  userId: string;
}

export class SendMessageDto {
  @ApiProperty({ maxLength: CHAT_MESSAGE_MAX })
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_MESSAGE_MAX)
  body: string;
}

export class MessagesQueryDto {
  @ApiPropertyOptional({ description: "Only messages older than this instant (paging back)" })
  @IsOptional()
  @IsISO8601()
  before?: string;

  @ApiPropertyOptional({ description: "Only messages newer than this instant (polling)" })
  @IsOptional()
  @IsISO8601()
  after?: string;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
