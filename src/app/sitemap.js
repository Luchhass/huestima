import { absoluteUrl, SITE_LAST_MODIFIED } from "@/lib/seo";
import { LANDING_FAMILIES, landingHref } from "../../shared/landingRoutes.mjs";

export default function sitemap() {
  return LANDING_FAMILIES.flatMap((family) => ["en", "tr"].map((locale) => ({
    url: absoluteUrl(landingHref(family, locale)),
    lastModified: new Date(SITE_LAST_MODIFIED),
    alternates: { languages: {
      en: absoluteUrl(landingHref(family, "en")),
      tr: absoluteUrl(landingHref(family, "tr")),
      "x-default": absoluteUrl(landingHref(family, "en")),
    } },
    images: [absoluteUrl(family === "perception" ? "/og-color.png" : `/og-${family}.png`)],
  })));
}
