export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export function initializeAnalytics() {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag("set", {
    page_location: sanitizeAnalyticsLocation(window.location.href || window.location.pathname),
    page_path: sanitizeAnalyticsLocation(window.location.pathname),
    page_referrer: typeof document !== "undefined" && document.referrer ? sanitizeAnalyticsLocation(document.referrer) : "",
  });

  if (!window.__huestimaGaConfigured) {
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
    window.__huestimaGaConfigured = true;
  }

  return true;
}

export function trackEvent(eventName, params = {}) {
  if (!initializeAnalytics()) return;

  if (window.location.pathname.startsWith("/admin")) return;
  const family = /^\/(?:tr\/)?(color|flag|cartoon|brand|team|perception)(?:\/|$)/.exec(window.location.pathname)?.[1];
  window.gtag("event", eventName, {
    ...(family ? { game_family: family } : {}),
    content_language: document.documentElement.lang || "en",
    ...params,
  });
}

export function sanitizeAnalyticsLocation(value) {
  const url = new URL(value, "https://www.huestima.com");
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/\d{6}(?=\/|$)/g, "/room");
  return String(value).startsWith("/") ? url.pathname : url.toString();
}

export function trackPageView({ pagePath, pageLocation, pageTitle }) {
  if (!initializeAnalytics()) return;

  // Configuration disables automatic pageviews; navigation sends an explicit event.
  trackEvent("page_view", {
    page_path: sanitizeAnalyticsLocation(pagePath),
    page_location: sanitizeAnalyticsLocation(pageLocation),
    page_title: pageTitle,
  });
}

export function trackMatchStart({ gameType, difficulty, gameMode }) {
  trackEvent("level_start", {
    level_name: `${gameType}_${gameMode}_${difficulty}`,
    game_type: gameType,
    difficulty,
    game_mode: gameMode,
  });
}

export function trackMatchEnd({
  gameType,
  difficulty,
  gameMode,
  totalScore,
  averageScore,
  rounds,
  progressValue,
  progressUnit,
}) {
  const levelName = `${gameType}_${gameMode}_${difficulty}`;

  trackEvent("level_end", {
    level_name: levelName,
    success: true,
    game_type: gameType,
    difficulty,
    game_mode: gameMode,
    rounds,
    score_average: averageScore,
    ...(Number.isFinite(progressValue) ? { progress_value: progressValue } : {}),
    ...(progressUnit ? { progress_unit: progressUnit } : {}),
  });

  trackEvent("post_score", {
    score: totalScore,
    level: rounds,
    game_category: gameType,
    game_type: gameType,
    difficulty,
    game_mode: gameMode,
    score_average: averageScore,
    ...(Number.isFinite(progressValue) ? { progress_value: progressValue } : {}),
    ...(progressUnit ? { progress_unit: progressUnit } : {}),
  });
}
