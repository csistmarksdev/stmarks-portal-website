import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { roleHasPermission, type Permission } from "@portal/shared";

import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import type { AuthenticatedUser } from "../interfaces/authenticated-user";

/** RBAC guard — checks @RequirePermissions() against the static role matrix. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as
      | AuthenticatedUser
      | undefined;
    if (!user) throw new ForbiddenException("Not authenticated");

    const missing = required.filter(
      (permission) => !roleHasPermission(user.role, permission),
    );
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Role "${user.role}" lacks permission(s): ${missing.join(", ")}`,
      );
    }
    return true;
  }
}
