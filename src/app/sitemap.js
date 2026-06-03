import { absoluteUrl, SITE_LAST_MODIFIED } from "@/lib/seo";

export default function sitemap() {
  const lastModified = new Date(SITE_LAST_MODIFIED);

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/play/singleplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/play/multiplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.82,
    },
  ];
}
