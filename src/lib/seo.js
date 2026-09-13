import { APP_NAME } from "./constants";
import { GAME_LANDING_CONTENT, LANDING_UPDATED } from "./gameLandingContent.mjs";
import { LANDING_FAMILIES, landingHref } from "../../shared/landingRoutes.mjs";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.huestima.com";

export const SITE_IMAGE_PATH = "/og-color.png";
export const SITE_IMAGE_URL = absoluteUrl(SITE_IMAGE_PATH);
export const SITE_IMAGE_WIDTH = 1732;
export const SITE_IMAGE_HEIGHT = 908;
export const SITE_LAST_MODIFIED = LANDING_UPDATED;

export const SITE_DESCRIPTION =
  "Play free color memory and perception games with colors, flags, cartoon characters, brands, teams and visual patterns.";

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
    path: "/color",
  },
  color: {
    title: "Huestima Color",
    description:
      "Play Huestima Color, the classic hue estimate game with normal, flash, sequence, timed, gradient, and endless modes.",
    path: "/color",
  },
  flag: {
    title: "Huestima Flag",
    description:
      "Play Huestima Flag, a flag color guessing game where you match the colors behind fixed emblems.",
    path: "/flag",
  },
  cartoon: {
    title: "Huestima Cartoon",
    description:
      "Play Huestima Cartoon, a cartoon scene color guessing game with adjustable character masks.",
    path: "/cartoon",
  },
  brand: {
    title: "Huestima Brand",
    description:
      "Play Huestima Brand, a logo color memory game where you rebuild familiar brand backdrops from memory.",
    path: "/brand",
  },
  team: {
    title: "Huestima Teams",
    description: "Play Huestima Teams, a team logo color memory game.",
    path: "/team",
  },
  perceptionSingleplayer: {
    title: "Huestima Perception Singleplayer",
    description: "Play Pattern and Odd visual perception modes in Huestima singleplayer.",
    path: "/perception/singleplayer",
  },
  perceptionMultiplayer: {
    title: "Huestima Perception Multiplayer",
    description: "Play Pattern and Odd visual perception modes with friends in a shared Huestima lobby.",
    path: "/perception/multiplayer",
  },
  privacyPolicy: {
    title: "Huestima Privacy Policy",
    description: "How Huestima handles browser storage, multiplayer data, match sharing, analytics, and privacy choices.",
    path: "/privacy-policy",
  },
  download: {
    title: "Huestima Mobile Download",
    description: "Download the upcoming Huestima mobile game from the App Store or Google Play.",
    path: "/download",
  },
  brandSingleplayer: {
    title: "Huestima Brand Singleplayer",
    description: "Memorize iconic brand colors and rebuild them in Huestima Brand singleplayer.",
    path: "/brand/singleplayer",
  },
  brandMultiplayer: {
    title: "Huestima Brand Multiplayer",
    description: "Create or join Huestima Brand multiplayer lobbies for shared logo color rounds.",
    path: "/brand/multiplayer",
  },
  teamSingleplayer: {
    title: "Huestima Teams Singleplayer",
    description: "Memorize team colors and rebuild them in Huestima Teams singleplayer.",
    path: "/team/singleplayer",
  },
  teamMultiplayer: {
    title: "Huestima Teams Multiplayer",
    description: "Create or join Huestima Teams multiplayer lobbies.",
    path: "/team/multiplayer",
  },
  colorSingleplayer: {
    title: "Huestima Color Singleplayer",
    description:
      "Play the isolated Huestima Color singleplayer game with classic hue, flash, sequence, timed, and gradient rounds.",
    path: "/color/singleplayer",
  },
  flagSingleplayer: {
    title: "Huestima Flag Singleplayer",
    description:
      "Play the isolated Huestima Flag singleplayer game and match flag colors from memory.",
    path: "/flag/singleplayer",
  },
  cartoonSingleplayer: {
    title: "Huestima Cartoon Singleplayer",
    description:
      "Play the isolated Huestima Cartoon singleplayer game and rebuild cartoon scene colors from memory.",
    path: "/cartoon/singleplayer",
  },
  colorMultiplayer: {
    title: "Huestima Color Multiplayer",
    description:
      "Create or join Huestima Color multiplayer lobbies for shared color guessing rounds.",
    path: "/color/multiplayer",
  },
  flagMultiplayer: {
    title: "Huestima Flag Multiplayer",
    description:
      "Create or join isolated Huestima Flag multiplayer lobbies.",
    path: "/flag/multiplayer",
  },
  cartoonMultiplayer: {
    title: "Huestima Cartoon Multiplayer",
    description:
      "Create or join isolated Huestima Cartoon multiplayer lobbies.",
    path: "/cartoon/multiplayer",
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

const ROUTE_IMAGE_PATHS = {
  home: SITE_IMAGE_PATH,
  color: SITE_IMAGE_PATH,
  flag: "/og-flag.png",
  cartoon: "/og-cartoon.png",
  brand: "/og-brand.png",
  team: "/og-team.png",
  perception: SITE_IMAGE_PATH,
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata(route, options = {}) {
  const locale = options.locale === "tr" ? "tr" : "en";
  const isLanding = LANDING_FAMILIES.includes(route);
  const seo = isLanding
    ? { ...GAME_LANDING_CONTENT[route][locale], path: landingHref(route, locale) }
    : ROUTE_SEO[route];
  const url = absoluteUrl(seo.path);
  const imagePath = ROUTE_IMAGE_PATHS[route];
  const images = imagePath
    ? [
        {
          url: absoluteUrl(imagePath),
          width: SITE_IMAGE_WIDTH,
          height: SITE_IMAGE_HEIGHT,
          alt: `${seo.title} game preview`,
          type: "image/png",
        },
      ]
    : [];

  return {
    title: {
      absolute: seo.title,
    },
    description: seo.description,
    alternates: {
      canonical: url,
      ...(isLanding ? { languages: {
        en: absoluteUrl(landingHref(route, "en")),
        tr: absoluteUrl(landingHref(route, "tr")),
        "x-default": absoluteUrl(landingHref(route, "en")),
      } } : {}),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: APP_NAME,
      ...(images.length ? { images } : {}),
      locale: locale === "tr" ? "tr_TR" : "en_US",
      ...(isLanding ? { alternateLocale: [locale === "tr" ? "en_US" : "tr_TR"] } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      ...(images.length ? { images } : {}),
    },
    robots: options.robots || (isLanding
      ? { index: true, follow: true, "max-image-preview": "large" }
      : /Singleplayer$|Multiplayer$|^(singleplayer|multiplayer|download)$/.test(route)
        ? { index: false, follow: true }
        : { index: true, follow: true }),
  };
}

export function createJsonLd(family, locale = "en") {
  if (family && LANDING_FAMILIES.includes(family)) {
    const content = GAME_LANDING_CONTENT[family][locale];
    const url = absoluteUrl(landingHref(family, locale));
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage", "@id": `${url}#webpage`, url,
          name: content.title, description: content.description, inLanguage: locale,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          mainEntity: { "@id": `${url}#game` }, dateModified: LANDING_UPDATED,
        },
        {
          "@type": ["VideoGame", "WebApplication"], "@id": `${url}#game`,
          name: `Huestima ${content.name}`, url, description: content.intro,
          image: absoluteUrl(ROUTE_IMAGE_PATHS[family]), inLanguage: locale,
          applicationCategory: "GameApplication", operatingSystem: "Web browser",
          gamePlatform: "Web browser", genre: family === "perception" ? ["Puzzle game", "Color perception game"] : ["Memory game", "Color guessing game"],
          playMode: ["https://schema.org/SinglePlayer", "https://schema.org/MultiPlayer"],
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          creator: { "@id": `${SITE_URL}/#creator` },
          mainEntityOfPage: { "@id": `${url}#webpage` },
        },
      ],
    };
  }
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
        url: absoluteUrl("/color"),
        description: SITE_DESCRIPTION,
        inLanguage: ["en", "tr"],
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

    ],
  };
}
