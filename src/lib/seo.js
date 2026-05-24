import { APP_NAME } from "./constants";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.huestima.com";

export const SITE_IMAGE_PATH = "/og-image.png";
export const SITE_IMAGE_URL = absoluteUrl(SITE_IMAGE_PATH);
export const SITE_IMAGE_WIDTH = 1730;
export const SITE_IMAGE_HEIGHT = 909;

export const SITE_DESCRIPTION =
  "Huestima is a free online color memory game. Memorize a shade, rebuild it with hue, saturation, and brightness controls, then score your eye across five rounds.";

export const SEO_KEYWORDS = [
  "Huestima",
  "color game",
  "color memory game",
  "color guessing game",
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
    title: "Huestima - Free Online Color Memory Game",
    description:
      "Play Huestima, a minimal online color game where you memorize a shade for five seconds, rebuild it with HSV controls, and score your precision.",
    path: "/",
  },
  singleplayer: {
    title: "Singleplayer Color Game - Huestima",
    description:
      "Play Huestima singleplayer across five color memory rounds. Choose Easy, Normal, or Hard, memorize each target color, and recreate it from memory.",
    path: "/play/singleplayer",
  },
  multiplayer: {
    title: "Multiplayer Color Game - Huestima",
    description:
      "Create a private Huestima lobby, invite friends, and compete in a multiplayer color memory game across five shared rounds.",
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
        alternateName: ["Huestima Color Game", "Huestima Color Memory Game"],
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
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#game`,
        name: APP_NAME,
        alternateName: "Huestima Color Memory Game",
        url: SITE_URL,
        image: SITE_IMAGE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "GameApplication",
        operatingSystem: "Web browser",
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
