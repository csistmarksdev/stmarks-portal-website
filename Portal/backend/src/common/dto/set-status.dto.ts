import { ApiProperty } from "@nestjs/swagger";
import { PUBLISH_STATUSES, type PublishStatus } from "@portal/shared";
import { IsIn } from "class-validator";

/** Body of the draft/publish/archive workflow endpoints. */
export class SetStatusDto {
  @ApiProperty({ enum: PUBLISH_STATUSES })
  @IsIn(PUBLISH_STATUSES as readonly string[])
  status: PublishStatus;
}
