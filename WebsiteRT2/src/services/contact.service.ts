import type {
  ContactFormSubmission,
  ContactSubmissionResult,
} from "@/types/content";

/**
 * Contact form submission → `POST /api/contact` on the site's own origin
 * (F-009). That route forwards to the Portal from the server, so the browser
 * never talks to the Portal directly - previously it posted to
 * `http://129.225.110.39/v1/contact` from an HTTPS page, which browsers block
 * as mixed content, and every message was lost.
 *
 * Failures are reported honestly: `notConnected` when no backend is
 * configured, `error` for anything else - a visitor is never told a message
 * was delivered when it was not.
 */
export async function submitContactForm(
  values: ContactFormSubmission,
): Promise<ContactSubmissionResult> {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    });
    const result = (await response
      .json()
      .catch(() => null)) as ContactSubmissionResult | null;
    if (!result) return { success: false, messageKey: "error" };
    return { success: response.ok && result.success, messageKey: result.messageKey };
  } catch {
    return { success: false, messageKey: "error" };
  }
}
