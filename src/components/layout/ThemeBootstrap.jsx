import Script from "next/script";
import {
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/constants";

const bootstrapScript = String.raw`
(() => {
  try {
    const storedTheme = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : preferredTheme;

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const language =
      /^\/tr\/(color|flag|cartoon|brand|team)\/?$/.test(window.location.pathname)
        ? "tr"
        : /^\/(color|flag|cartoon|brand|team)\/?$/.test(window.location.pathname)
          ? "en"
          : window.localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)}) === "tr"
        ? "tr"
        : "en";
    document.documentElement.lang = language;
    document.documentElement.dataset.locale = language;

    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const isGameFamilyPath = ["color", "flag", "cartoon", "brand", "team"].includes(pathSegments[0]);
    const isInviteRoomPath =
      pathSegments.length === 2 &&
      isGameFamilyPath &&
      /^\d{6}$/.test(pathSegments[1]);
    const isLandingEntryPath =
      window.location.pathname === "/" ||
      /^\/(?:tr\/)?(color|flag|cartoon|brand|team)\/?$/.test(
        window.location.pathname,
      );
    const isEntryPath = isLandingEntryPath || isInviteRoomPath;
    const hasSeenIntro =
      window.sessionStorage.getItem("huestima-page-intro-seen") === "true";
    const hasPendingFooterReturn =
      window.sessionStorage.getItem("huestima-card-enter") === "true";
    const navigationType = window.performance?.getEntriesByType("navigation")[0]?.type;
    const isReloadHomeEntry =
      navigationType === "reload" &&
      isLandingEntryPath;
    const shouldPlayIntro =
      isEntryPath &&
      !hasPendingFooterReturn &&
      (!hasSeenIntro || isReloadHomeEntry);

    if (shouldPlayIntro) {
      document.documentElement.dataset.pageIntroPending = "true";

      window.setTimeout(() => {
        if (document.documentElement.dataset.pageIntroPending === "true") {
          delete document.documentElement.dataset.pageIntroPending;
        }
      }, 8200);
    }
  } catch {}
})();
`;

export default function ThemeBootstrap() {
  return (
    // This must run before hydration to prevent theme and intro flashes.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script
      id="theme-bootstrap"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: bootstrapScript }}
    />
  );
}
