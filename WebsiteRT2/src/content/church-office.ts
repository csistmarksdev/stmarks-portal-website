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

  /**
   * TODO(church-office): the Hon. Secretary's and Hon. Treasurer's contact
   * details for enquiries about Sunday School, baptism and weddings. Until they
   * are supplied, the enquiry note points readers to the Leadership section.
   */
  enquiryContacts: [] as { role: LocalizedText; phone?: string; email?: string }[],
} as const;
