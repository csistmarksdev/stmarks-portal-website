import { CHURCH_OFFICE } from "@/content/church-office";
import { LEADERS as ALL_LEADERS } from "@/content/leadership";
import type { Leader, LeaderRole } from "@/types/content";

import { mockResponse } from "./http";

/**
 * Leadership is **permanent site content**, read from
 * `src/content/leadership.ts`. Appointments happen roughly once a year, so the
 * roll is versioned with the code rather than administered in the Portal -
 * there is no `/leadership` endpoint and these must **not** become `apiGet`
 * calls. Edit that file and redeploy.
 *
 * The `Promise` signatures stay so call sites read the same as the CMS-backed
 * services around them.
 */

const byOrder = (a: Leader, b: Leader) => a.order - b.order;

/**
 * F-027: personal mobiles are published only while the church office's consent
 * switch is on (`CHURCH_OFFICE.publishPersonalPhones`). One flag, so every
 * card, list and tel: link follows it.
 */
const LEADERS: Leader[] = CHURCH_OFFICE.publishPersonalPhones
  ? ALL_LEADERS
  : ALL_LEADERS.map((leader) => ({ ...leader, phone: undefined }));

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

/** Employed staff - the sexton and anyone else on the church payroll. */
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

/**
 * F-007 / F-027: the public contact numbers for the site.
 *
 * The church office named the Hon. Secretary and the Hon. Treasurer as the
 * contacts for enquiries (handoff decision, 26 Nov 2026), and there is no
 * confirmed office landline yet. So Contact and the footer show these two,
 * read from the leadership roll so a new appointment updates every place at
 * once. They follow the same consent switch as the Leadership cards
 * (`CHURCH_OFFICE.publishPersonalPhones`): turn it off and they disappear.
 *
 * Deliberately not fed into JSON-LD `telephone`: a personal mobile is not
 * the organisation's number. That waits for a real office phone.
 */
const ENQUIRY_CONTACT_IDS = ["ld-3", "ld-4"] as const; // Hon. Secretary, Hon. Treasurer

export function getEnquiryContacts(): Promise<Leader[]> {
  const contacts = ENQUIRY_CONTACT_IDS.map((id) =>
    LEADERS.find((l) => l.id === id),
  ).filter((l): l is Leader => Boolean(l?.phone));

  return mockResponse(contacts);
}
