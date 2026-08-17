import {
  FULLSCREEN_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/constants";

const bootstrapScript = `
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
      window.localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)}) === "tr"
        ? "tr"
        : "en";
    document.documentElement.lang = language;
    document.documentElement.dataset.locale = language;

    const fullscreen = window.localStorage.getItem(${JSON.stringify(FULLSCREEN_STORAGE_KEY)});
    document.documentElement.dataset.fullscreenMode =
      fullscreen === "on" || fullscreen === "true" ? "on" : "off";

    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const isGameFamilyPath = ["color", "flag", "cartoon"].includes(pathSegments[0]);
    const isInviteRoomPath =
      pathSegments.length === 2 &&
      isGameFamilyPath &&
      /^\\d{6}$/.test(pathSegments[1]);
    const shouldPlayIntro =
      window.location.pathname === "/" ||
      (pathSegments.length === 1 && isGameFamilyPath) ||
      isInviteRoomPath;

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
  return <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />;
}
