export const LANDING_FAMILIES = Object.freeze(["color", "flag", "cartoon", "brand", "team"]);

export function getLandingRoute(pathname = "") {
  const match = /^\/(tr\/)?(color|flag|cartoon|brand|team)\/?$/.exec(pathname);
  return match ? { locale: match[1] ? "tr" : "en", family: match[2] } : null;
}

export function landingHref(family, locale = "en") {
  if (!LANDING_FAMILIES.includes(family)) throw new Error(`Unknown game family: ${family}`);
  return `${locale === "tr" ? "/tr" : ""}/${family}`;
}

export function localizeLandingHref(href, locale) {
  const route = getLandingRoute(href);
  return route ? landingHref(route.family, locale) : href;
}
