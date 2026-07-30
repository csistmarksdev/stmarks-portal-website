import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { PastorMessage, ServiceTiming, WeeklyVerse } from "@portal/shared";

import { Public } from "../../common/decorators/public.decorator";
import { ChurchService } from "./church.service";

/**
 * Church singletons the CMS owns (contract §5.8).
 *
 * `/church/profile`, `/church/history`, `/church/vision-mission`,
 * `/church/diocese` and `/hero-slides` are deliberately absent: that content
 * is written once and hardcoded in the Website, so the Portal does not store
 * or serve it. Serving it from here would have meant an endpoint returning
 * data nobody could edit.
 */
@ApiTags("Public — Church")
@Public()
@Controller("church")
export class ChurchPublicController {
  constructor(private readonly church: ChurchService) {}

  @Get("service-timings")
  @ApiOperation({ summary: "Service timings" })
  serviceTimings(): Promise<ServiceTiming[]> {
    return this.church.get<ServiceTiming[]>("service-timings");
  }

  @Get("pastor-message")
  @ApiOperation({ summary: "Pastor's message (home page)" })
  pastorMessage(): Promise<PastorMessage> {
    return this.church.get<PastorMessage>("pastor-message");
  }

  @Get("weekly-verse")
  @ApiOperation({ summary: "Weekly verse (home page)" })
  weeklyVerse(): Promise<WeeklyVerse> {
    return this.church.get<WeeklyVerse>("weekly-verse");
  }
}
