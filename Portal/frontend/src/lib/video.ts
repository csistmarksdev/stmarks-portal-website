/**
 * Mirrors the Website's player so the admin gets the same verdict the site
 * will reach - a hosted link with no extractable id renders an empty player
 * there, which is impossible to diagnose after the fact.
 */
export function readVideoUrl(raw: string) {
  const url = raw.trim();
  if (!url) return null;

  if (/(?:youtube\.com|youtu\.be)/i.test(url)) {
    const id = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1];
    return {
      provider: "YouTube",
      hosted: true,
      // The same privacy-preserving host the Website embeds from, so what
      // plays here is exactly what a visitor will get.
      embed: id
        ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
        : null,
      problem: id
        ? null
        : "That YouTube link has no video id. Copy it from the address bar or the Share button.",
    };
  }
  if (/vimeo\.com/i.test(url)) {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return {
      provider: "Vimeo",
      hosted: true,
      embed: id ? `https://player.vimeo.com/video/${id}` : null,
      problem: id
        ? null
        : "That Vimeo link has no video id. It should look like vimeo.com/123456789.",
    };
  }
  try {
    new URL(url);
    return { provider: "video file", hosted: false, embed: null, problem: null };
  } catch {
    return {
      provider: "video file",
      hosted: false,
      embed: null,
      problem: "That is not a full web address.",
    };
  }
}

/** A still for a hosted video, used in previews when no image is chosen. */
export function videoThumbnail(raw: string): string | null {
  const id = raw.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
