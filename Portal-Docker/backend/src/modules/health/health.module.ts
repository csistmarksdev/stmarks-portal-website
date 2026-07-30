import { Controller, Get, Module, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Connection } from "mongoose";

import { Public } from "../../common/decorators/public.decorator";

/**
 * Liveness/readiness probe for whatever runs the container.
 *
 * Reports the database connection rather than just "the process is up" — a
 * Nest app whose Mongo connection has dropped answers HTTP fine while every
 * request fails, which is exactly the state a probe needs to catch.
 */
@ApiTags("Health")
@Public()
@Controller("health")
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: "Liveness + database readiness (503 when degraded)" })
  check() {
    // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting.
    const ready = this.connection.readyState === 1;
    const body = {
      status: ready ? "ok" : "degraded",
      database: ready ? "connected" : "unavailable",
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };

    if (!ready) throw new ServiceUnavailableException(body);
    return body;
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
