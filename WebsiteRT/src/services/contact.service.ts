import { API_BASE_URL } from "@/constants/site";
import type {
  ContactFormValues,
  ContactSubmissionResult,
} from "@/types/content";

import { apiPost } from "./http";

/**
 * Contact form submission → `POST /contact`.
 *
 * The API stores the message in the Portal's contact inbox and returns
 * `{ success, messageKey }`; the form surfaces the key as a translated notice.
 *
 * Two failure modes are reported honestly rather than as success:
 *  - no API configured  → `notConnected`, the same notice as before the backend
 *  - the request failed → `error`, so a visitor is never told their message was
 *    delivered when it was not. That includes the 429 from the endpoint's spam
 *    throttle (3 per minute per IP).
 */
export async function submitContactForm(
  values: ContactFormValues,
): Promise<ContactSubmissionResult> {
  if (!API_BASE_URL) {
    return { success: false, messageKey: "notConnected" };
  }

  try {
    return await apiPost<ContactSubmissionResult>("/contact", values);
  } catch {
    return { success: false, messageKey: "error" };
  }
}
