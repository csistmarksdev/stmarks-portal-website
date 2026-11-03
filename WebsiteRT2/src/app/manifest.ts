import type { MetadataRoute } from "next";

import messages from "@/messages/ta.json";

/**
 * Home-screen install. `standalone` is what lets iOS run the site full screen,
 * with the hero behind the status bar, when launched from its icon. Named in
 * Tamil because Tamil is the locale served from `/`, the `start_url`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages.site.name,
    short_name: messages.site.shortName,
    description: messages.site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#292929",
    theme_color: "#292929",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
