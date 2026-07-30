import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@portal/shared";

export const PERMISSIONS_KEY = "requiredPermissions";

/** Requires the authenticated user's role to grant ALL listed permissions. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
