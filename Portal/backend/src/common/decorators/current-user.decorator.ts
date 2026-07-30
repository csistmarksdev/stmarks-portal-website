import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { AuthenticatedUser } from "../interfaces/authenticated-user";

/** Injects the user attached to the request by the JWT strategy. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
