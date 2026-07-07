import { APP_NAME } from "@/lib/constants";
import {
  SITE_DESCRIPTION,
  SITE_IMAGE_HEIGHT,
  SITE_IMAGE_WIDTH,
} from "@/lib/seo";

export default function manifest() {
  return {
    name: `${APP_NAME} - Color Memory Game`,
    short_name: APP_NAME,
    description: SITE_DESCRIPTION,
    id: "/color",
    start_url: "/color",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    screenshots: [
      {
        src: "/og-image.png",
        sizes: `${SITE_IMAGE_WIDTH}x${SITE_IMAGE_HEIGHT}`,
        type: "image/png",
        form_factor: "wide",
        label: `${APP_NAME} color memory game preview`,
      },
    ],
  };
}
