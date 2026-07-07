export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export function initializeAnalytics() {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!window.__huestimaGaConfigured) {
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
    window.__huestimaGaConfigured = true;
  }

  return true;
}

export function trackEvent(eventName, params = {}) {
  if (!initializeAnalytics()) return;

  window.gtag("event", eventName, params);
}

export function trackPageView({ pagePath, pageLocation, pageTitle }) {
  if (!initializeAnalytics()) return;

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: pagePath,
    page_location: pageLocation,
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
  });

  trackEvent("post_score", {
    score: totalScore,
    level: rounds,
    game_category: gameType,
    game_type: gameType,
    difficulty,
    game_mode: gameMode,
    score_average: averageScore,
  });
}
