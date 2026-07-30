import type { UserRole } from "@portal/shared";

/** Shape attached to `request.user` after JWT validation. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}
