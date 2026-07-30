import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Notifies the public Website's revalidation webhook when content changes
 * (spec §4 — cache tags per resource).
 *
 * Without this the site's caches expire on their own schedule, and — because
 * each URL is cached separately — a list page and a detail page can disagree
 * about the same record for minutes after an edit. Renaming a gallery album
 * showed the new title on `/gallery` and the old one on the album's own page.
 *
 * A no-op until `WEBSITE_REVALIDATE_URL` is set, so the Portal runs standalone
 * without a site to notify.
 */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Fire-and-forget: a publish must never fail because the website could not
   * be reached. Failures are logged, not raised.
   *
   * The secret travels in a header rather than the query string — query
   * strings end up in access logs, proxy logs and browser history, which is a
   * poor place for a shared credential.
   */
  trigger(...tags: string[]): void {
    const url = this.config.get<string>("revalidate.url");
    if (!url || tags.length === 0) return;

    const secret = this.config.get<string>("revalidate.secret");

    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-revalidate-secret": secret } : {}),
      },
      body: JSON.stringify({ tags }),
      // A slow website must not leave requests hanging around the API.
      signal: AbortSignal.timeout(5000),
    })
      .then(async (response) => {
        if (!response.ok) {
          this.logger.warn(
            `Revalidation returned ${response.status} for [${tags.join(", ")}]: ${await response
              .text()
              .catch(() => "")}`,
          );
        }
      })
      .catch((error: Error) => {
        this.logger.warn(
          `Revalidation webhook failed for [${tags.join(", ")}]: ${error.message}`,
        );
      });
  }
}
