import { APP_NAME } from "@/lib/constants";
import { SITE_DESCRIPTION } from "@/lib/seo";

export default function manifest() {
  return {
    name: `${APP_NAME} - Color Memory Game`,
    short_name: APP_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait-primary",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
