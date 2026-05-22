import { absoluteUrl } from "@/lib/seo";

export default function sitemap() {
  const lastModified = new Date();

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
  ];
}
