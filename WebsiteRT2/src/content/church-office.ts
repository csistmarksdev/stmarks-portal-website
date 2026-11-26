import type { LocalizedText } from "@/types/common";

/**
 * Facts only the church office can supply.
 *
 * Every value here is either unknown or awaiting confirmation. Nothing in this
 * file may be filled in with a guess: each entry is a `TODO(church-office)`
 * tracked in `team/build/church-office-todo.md`, and the site renders cleanly
 * (the line is simply left out) while a value is empty.
 *
 * Where the audit found a value to be wrong - the placeholder landline
 * `+91 44 2242 0000` and the address on the unregistered domain
 * `office@csistmarksmadipakkam.org` - it has been removed, not replaced.
 */
export const CHURCH_OFFICE = {
  /**
   * TODO(church-office): the real church office phone number (F-007).
   * The previous value, +91 44 2242 0000, matched no listing and was removed.
   */
  officePhones: [] as string[],

  /**
   * TODO(church-office): a working office email address (F-007).
   * office@csistmarksmadipakkam.org cannot receive mail (domain not registered).
   * Do not re-add it until the domain and its MX records are live.
   */
  officeEmails: [] as string[],

  /**
   * TODO(church-office): confirm the office hours (F-007). Kept because they
   * are unverified rather than known to be wrong.
   */
  officeHours: {
    en: "Monday to Saturday, 9:00 AM – 5:00 PM",
    ta: "திங்கள் முதல் சனி வரை, காலை 9:00 – மாலை 5:00",
  } satisfies LocalizedText,

  /**
   * TODO(church-office): written consent from each person whose personal mobile
   * is published in Leadership (F-027) - the two presbyters, the Hon.
   * Secretary, the Hon. Treasurer and the sexton. Set to `false` to hide every
   * personal number at once if consent is not given.
   */
  publishPersonalPhones: true,

  /*
   * Enquiry contacts (Sunday School, baptism, weddings) are the Hon. Secretary
   * and Hon. Treasurer. Their numbers come from the leadership roll via
   * `getEnquiryContacts()` in services/leadership.service.ts and are shown in
   * Contact and the footer while `publishPersonalPhones` is on.
   * TODO(church-office): written consent from both (F-027).
   */

  /**
   * TODO(church-office): the three facts the Privacy Notice needs (F-036).
   * While any is missing, /privacy answers 404 and the contact form shows no
   * consent line - a notice with blanks in it would be worse than none.
   *  - retentionMonths: how long contact-form messages are kept (audit
   *    suggests 12)
   *  - grievanceOfficer: who handles data requests (audit suggests the
   *    Hon. Secretary)
   *  - grievanceEmail: a working address (not on an unregistered domain)
   */
  privacy: {
    retentionMonths: null as number | null,
    grievanceOfficer: null as LocalizedText | null,
    grievanceEmail: null as string | null,
  },
} as const;

/** True once the office has supplied everything the Privacy Notice states. */
export function privacyNoticeReady(): boolean {
  const p = CHURCH_OFFICE.privacy;
  return Boolean(p.retentionMonths && p.grievanceOfficer && p.grievanceEmail);
}
