import type { Permission, RoleKey } from "@portal/shared";

/** Shape attached to `request.user` after JWT validation. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  /** Built-in or custom role key. */
  role: RoleKey;
  /**
   * What the role allows, resolved from the role on every request - so editing
   * a custom role takes effect immediately, not when tokens next refresh.
   */
  permissions: Permission[];
}
