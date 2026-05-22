import { APP_NAME } from "./constants";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://huestima.app";

export const SITE_DESCRIPTION =
  "Huestima is a polished browser-based color memory game. See a shade for five seconds, rebuild it from memory, and score your eye across five rounds.";

export const SEO_KEYWORDS = [
  "Huestima",
  "color memory game",
  "color guessing game",
  "browser color game",
  "singleplayer color game",
  "HSV color picker game",
  "hue saturation brightness game",
  "visual memory game",
  "color perception game",
  "online color challenge",
  "memory challenge",
  "frontend game",
];

export const ROUTE_SEO = {
  home: {
    title: "Huestima - Color Memory Game",
    description:
      "Play Huestima, a minimal color memory game where you memorize a shade for five seconds, rebuild it with HSV controls, and score your precision.",
    path: "/",
  },
  singleplayer: {
    title: "Solo Mode - Huestima Color Memory Game",
    description:
      "Play Huestima solo mode across five rounds. Choose Easy, Normal, or Hard, memorize each target color, and recreate it from memory.",
    path: "/play/singleplayer",
  },
  multiplayer: {
    title: "Multiplayer - Huestima Color Memory Game",
    description:
      "Create a private Huestima lobby, invite friends, and compete across five shared color memory rounds.",
    path: "/play/multiplayer",
  },
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata(route, options = {}) {
  const seo = ROUTE_SEO[route];
  const url = absoluteUrl(seo.path);
  const images = [
    {
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: `${APP_NAME} color memory game preview`,
    },
  ];

  return {
    title: {
      absolute: seo.title,
    },
    description: seo.description,
    alternates: {
      canonical: seo.path,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: APP_NAME,
      images,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/twitter-image"],
    },
    robots: options.robots,
  };
}
