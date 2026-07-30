import { LEADERS } from "@/content/leadership";
import type { Leader, LeaderRole } from "@/types/content";

import { mockResponse } from "./http";

/**
 * Leadership is **permanent site content**, read from
 * `src/content/leadership.ts`. Appointments happen roughly once a year, so the
 * roll is versioned with the code rather than administered in the Portal —
 * there is no `/leadership` endpoint and these must **not** become `apiGet`
 * calls. Edit that file and redeploy.
 *
 * The `Promise` signatures stay so call sites read the same as the CMS-backed
 * services around them.
 */

const byOrder = (a: Leader, b: Leader) => a.order - b.order;

export function getLeadership(): Promise<Leader[]> {
  return mockResponse([...LEADERS].sort(byOrder));
}

export function getLeadersByRole(role: LeaderRole): Promise<Leader[]> {
  return mockResponse(LEADERS.filter((l) => l.role === role).sort(byOrder));
}

export function getCurrentPastors(): Promise<Leader[]> {
  return getLeadersByRole("pastor");
}

export function getAssistantPastors(): Promise<Leader[]> {
  return getLeadersByRole("assistant-pastor");
}

export function getCommittee(): Promise<Leader[]> {
  return getLeadersByRole("committee");
}

/** Employed staff — the sexton and anyone else on the church payroll. */
export function getStaff(): Promise<Leader[]> {
  return getLeadersByRole("staff");
}

export function getFormerPastors(): Promise<Leader[]> {
  return getLeadersByRole("former-pastor");
}

/** Pastors and assistant pastors, for the home-page preview. */
export function getLeadershipPreview(limit = 3): Promise<Leader[]> {
  const preview = LEADERS.filter(
    (l) => l.role === "pastor" || l.role === "assistant-pastor",
  ).sort(byOrder);

  return mockResponse(preview.slice(0, limit));
}
