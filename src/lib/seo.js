import { APP_NAME } from "./constants";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.huestima.com";

export const SITE_IMAGE_PATH = "/og-image.png";
export const SITE_IMAGE_URL = absoluteUrl(SITE_IMAGE_PATH);
export const SITE_IMAGE_WIDTH = 1730;
export const SITE_IMAGE_HEIGHT = 909;
export const SITE_LAST_MODIFIED = "2026-06-03T00:00:00.000Z";

export const SITE_DESCRIPTION =
  "Huestima is a free online hue estimate and color guessing game. Memorize a shade, rebuild it with hue, saturation, and brightness controls, then score your eye across custom levels.";

export const SEO_KEYWORDS = [
  "Huestima",
  "Huestima game",
  "Huestima color game",
  "hue estimate",
  "hue estimate game",
  "estimate hue",
  "estimate color",
  "guess the hue",
  "color game",
  "color memory game",
  "color guessing game",
  "color estimate game",
  "color estimator game",
  "free online color game",
  "browser color game",
  "online color game",
  "singleplayer color game",
  "multiplayer color game",
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
    title: "Huestima - Hue Estimate Color Game",
    description:
      "Play Huestima, a free online color game where you estimate hue, saturation, and brightness from memory. Guess the color in singleplayer or multiplayer rounds.",
    path: "/",
  },
  singleplayer: {
    title: "Hue Estimate Singleplayer Game - Huestima",
    description:
      "Play Huestima singleplayer across five hue estimate rounds. Choose Easy, Normal, or Hard, memorize each target color, and recreate it from memory.",
    path: "/play/singleplayer",
  },
  multiplayer: {
    title: "Multiplayer Color Guessing Game - Huestima",
    description:
      "Create a private Huestima lobby, invite friends, and compete in a multiplayer color guessing game across five shared hue estimate rounds.",
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
      url: SITE_IMAGE_URL,
      width: SITE_IMAGE_WIDTH,
      height: SITE_IMAGE_HEIGHT,
      alt: `${APP_NAME} free online color memory game preview`,
      type: "image/png",
    },
  ];

  return {
    title: {
      absolute: seo.title,
    },
    description: seo.description,
    keywords: SEO_KEYWORDS,
    alternates: {
      canonical: url,
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
      images,
    },
    robots: options.robots,
  };
}

export function createJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: APP_NAME,
        alternateName: [
          "Huestima Color Game",
          "Huestima Color Memory Game",
          "Hue Estimate Game",
        ],
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: {
          "@id": `${SITE_URL}/#creator`,
        },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#creator`,
        name: "furkancosar",
        url: "https://furkancosar.com",
      },
      {
        "@type": ["SoftwareApplication", "VideoGame"],
        "@id": `${SITE_URL}/#game`,
        name: APP_NAME,
        alternateName: [
          "Huestima Color Memory Game",
          "Huestima Hue Estimate Game",
          "Huestima Color Guessing Game",
        ],
        url: SITE_URL,
        image: SITE_IMAGE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "GameApplication",
        operatingSystem: "Web browser",
        gamePlatform: "Web browser",
        genre: ["Color game", "Memory game", "Guessing game"],
        playMode: ["SinglePlayer", "MultiPlayer"],
        browserRequirements: "Requires JavaScript and a modern web browser.",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        creator: {
          "@id": `${SITE_URL}/#creator`,
        },
        keywords: SEO_KEYWORDS.join(", "),
        featureList: [
          "Singleplayer color memory rounds",
          "Private multiplayer lobbies",
          "Hue, saturation, and brightness controls",
          "Easy, Normal, and Hard difficulty",
          "Normal, Flash, and Sequence game modes",
        ],
      },
    ],
  };
}
