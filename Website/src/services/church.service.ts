import {
  CHURCH_HISTORY,
  CHURCH_PROFILE,
  DIOCESE_INFO,
  VISION_MISSION,
} from "@/content/church";
import {
  PASTOR_MESSAGE,
  SERVICE_TIMINGS,
  WEEKLY_VERSE,
} from "@/data/church.mock";
import type {
  ChurchHistory,
  ChurchProfile,
  DioceseInfo,
  PastorMessage,
  ServiceTiming,
  VisionMission,
  WeeklyVerse,
} from "@/types/content";

import { mockResponse } from "./http";

/* -------------------------------------------------------------------------- */
/* Permanent site content — never fetched                                     */
/* -------------------------------------------------------------------------- */

/**
 * These four read from `src/content/church.ts` and will **stay that way**.
 *
 * The church's name, address, story, vision and diocese change once in a
 * decade, so they are versioned with the code rather than administered in the
 * Portal — there is no `/church/profile`, `/church/history`,
 * `/church/vision-mission` or `/church/diocese` endpoint to wire up. To change
 * any of them, edit `src/content/church.ts` and redeploy.
 *
 * They keep their `Promise` signatures so call sites read uniformly alongside
 * the CMS-backed getters below.
 */

export function getChurchProfile(): Promise<ChurchProfile> {
  return mockResponse(CHURCH_PROFILE);
}

export function getChurchHistory(): Promise<ChurchHistory> {
  return mockResponse(CHURCH_HISTORY);
}

export function getVisionMission(): Promise<VisionMission> {
  return mockResponse(VISION_MISSION);
}

export function getDioceseInfo(): Promise<DioceseInfo> {
  return mockResponse(DIOCESE_INFO);
}

/* -------------------------------------------------------------------------- */
/* Managed in the Portal CMS — swap for apiGet at integration                  */
/* -------------------------------------------------------------------------- */

/**
 * These three change often enough to be worth administering, so the Portal
 * serves them. Replace each body with the matching `apiGet` call when the
 * backend is wired in; the signatures and call sites stay as they are.
 */

export function getServiceTimings(): Promise<ServiceTiming[]> {
  // → apiGet<ServiceTiming[]>("/church/service-timings", { tags: ["church"] })
  return mockResponse(SERVICE_TIMINGS);
}

export function getPastorMessage(): Promise<PastorMessage> {
  // → apiGet<PastorMessage>("/church/pastor-message", { tags: ["church"] })
  return mockResponse(PASTOR_MESSAGE);
}

export function getWeeklyVerse(): Promise<WeeklyVerse> {
  // → apiGet<WeeklyVerse>("/church/weekly-verse", { tags: ["church"] })
  return mockResponse(WEEKLY_VERSE);
}
