import type { ImageAsset, LocalizedText } from "@/types/common";

/**
 * Placeholder imagery.
 *
 * The cinematic frame sequence already ships in `public/frames`, so we reuse
 * stills from it rather than adding unused binary assets. Every one of these
 * is replaced by real media URLs once the backend serves them.
 */
export function frame(index: number): string {
  return `/frames/ezgif-frame-${index.toString().padStart(3, "0")}.jpg`;
}

export function placeholderImage(
  index: number,
  alt: LocalizedText,
): ImageAsset {
  return {
    url: frame(index),
    alt,
    width: 1920,
    height: 1080,
  };
}
