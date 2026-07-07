import { absoluteUrl, SITE_LAST_MODIFIED } from "@/lib/seo";

export default function sitemap() {
  const lastModified = new Date(SITE_LAST_MODIFIED);

  return [
    {
      url: absoluteUrl("/color"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/flag"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.92,
    },
    {
      url: absoluteUrl("/cartoon"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.92,
    },
    {
      url: absoluteUrl("/color/singleplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/flag/singleplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.86,
    },
    {
      url: absoluteUrl("/cartoon/singleplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.86,
    },
    {
      url: absoluteUrl("/color/multiplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.82,
    },
    {
      url: absoluteUrl("/flag/multiplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/cartoon/multiplayer"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
