import { ForbiddenException } from "@nestjs/common";
import { roleHasPermission, type PublishStatus } from "@portal/shared";

import type { AuthenticatedUser } from "../interfaces/authenticated-user";

/**
 * Approval rule (church request, 22 Nov 2026).
 *
 * Only an admin or super admin - roles holding `content.publish` - can put
 * anything on the public site. Everyone else with `content.write` (editors)
 * can create and edit drafts and submit them for approval ("pending"); an
 * admin or super admin then approves (publishes) them. Admins and super admins
 * can also create and publish in one step.
 *
 * Enforced here, in the services, so it holds for every way a record can be
 * written - create, update, and the gallery's item endpoints - and cannot be
 * bypassed by sending `status: "published"` from the browser. The status
 * endpoint itself already requires `content.publish`.
 */

/** Statuses a user without `content.publish` may set. */
const SUBMITTER_STATUSES: readonly PublishStatus[] = ["draft", "pending"];

export function canPublish(actor: AuthenticatedUser): boolean {
  return roleHasPermission(actor.role, "content.publish");
}

/**
 * The status a create should use when the request does not name one. A record
 * type whose own default is "published" (fellowships) still starts as a draft
 * for a user who cannot publish.
 */
export function defaultStatusFor(
  actor: AuthenticatedUser,
  typeDefault: PublishStatus,
): PublishStatus {
  if (canPublish(actor)) return typeDefault;
  return SUBMITTER_STATUSES.includes(typeDefault) ? typeDefault : "draft";
}

/**
 * Throws unless `actor` may write a record that is currently `current` (omit
 * on create) and will afterwards be `next` (omit when unchanged).
 *
 * - Admins and super admins: anything.
 * - Others: only draft / pending, and never a record that is already live or
 *   archived - editing a published record would change the public site
 *   without approval.
 */
export function assertMayWrite(
  actor: AuthenticatedUser,
  next: PublishStatus | undefined,
  current?: PublishStatus,
): void {
  if (canPublish(actor)) return;

  if (current && !SUBMITTER_STATUSES.includes(current)) {
    throw new ForbiddenException(
      current === "published"
        ? "This item is published. Only an admin or super admin can change it - ask one to make the edit, or to move it back to draft."
        : "This item is archived. Only an admin or super admin can change it.",
    );
  }

  if (next && !SUBMITTER_STATUSES.includes(next)) {
    throw new ForbiddenException(
      "Only an admin or super admin can publish or archive. Save it as a draft, or submit it for approval.",
    );
  }
}

/**
 * Pinning an announcement unpins whatever is pinned now - a change to the live
 * site even when the new item is only a draft - so it is an approver's
 * action, like publishing.
 */
export function assertMayPin(actor: AuthenticatedUser, pinned: boolean | undefined): void {
  if (pinned === undefined || canPublish(actor)) return;
  throw new ForbiddenException(
    "Only an admin or super admin can pin or unpin an announcement.",
  );
}
