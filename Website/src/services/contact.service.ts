import type {
  ContactFormValues,
  ContactSubmissionResult,
} from "@/types/content";

/**
 * Contact form submission.
 *
 * There is no mail service yet, so this resolves without sending anything and
 * reports back a translation key the form surfaces as a notice. When the
 * NestJS API exists, replace the body with a POST to `/contact` — the
 * signature and call site stay the same.
 */
export async function submitContactForm(
  values: ContactFormValues,
): Promise<ContactSubmissionResult> {
  // Referenced so the unused-parameter lint stays honest about intent.
  void values;

  return {
    success: false,
    messageKey: "notConnected",
  };
}
