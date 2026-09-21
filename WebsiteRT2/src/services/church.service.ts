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

import { apiGet, mockResponse } from "./http";

/* -------------------------------------------------------------------------- */
/* Permanent site content - never fetched                                     */
/* -------------------------------------------------------------------------- */

/**
 * These four read from `src/content/church.ts` and will **stay that way**.
 *
 * The church's name, address, story, vision and diocese change once in a
 * decade, so they are versioned with the code rather than administered in the
 * Portal - there is no `/church/profile`, `/church/history`,
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
/* Managed in the Portal CMS - served by the API                               */
/* -------------------------------------------------------------------------- */

/**
 * These three change often enough to be worth administering, so the Portal
 * owns them and the API serves them. The mocks above remain only as the
 * unconfigured-environment fallback.
 */

const TAGS = ["church"];

export function getServiceTimings(): Promise<ServiceTiming[]> {
  return apiGet<ServiceTiming[]>("/church/service-timings", {
    tags: TAGS,
    fallback: () => SERVICE_TIMINGS,
  });
}

export function getPastorMessage(): Promise<PastorMessage> {
  return apiGet<PastorMessage>("/church/pastor-message", {
    tags: TAGS,
    fallback: () => PASTOR_MESSAGE,
  });
}

export function getWeeklyVerse(): Promise<WeeklyVerse> {
  return apiGet<WeeklyVerse>("/church/weekly-verse", {
    tags: TAGS,
    fallback: () => WEEKLY_VERSE,
  });
}
