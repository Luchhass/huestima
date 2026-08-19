"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import AdminProtectorCard from "@/components/admin/AdminProtectorCard";
import PushNotification from "@/components/ui/PushNotification";
import ComingSoonCard from "./ComingSoonCard";
import ModeSelector from "./ModeSelector";
import MultiplayerCard from "./MultiplayerCard";
import SingleplayerCard from "./SingleplayerCard";
import { useAdminMode } from "@/hooks/useAdminMode";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { clearAllGameSessions } from "@/hooks/useGameSession";
import { MUSIC_SCENES, useMusicScene } from "@/hooks/useMusicScene";
import { useTranslation } from "@/hooks/useLanguage";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { playScreenFadeOut, useScreenReveal } from "@/hooks/useScreenReveal";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_ROUND_COUNT,
  DIFFICULTY_IDS,
  GAME_MODE_IDS,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import {
  getDefaultGameModeForFamily,
  GAME_FAMILY_IDS,
  getGameFamilyHref,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import { getAvailableGameModeOptions } from "@/lib/gameMode";

const DIFFICULTY_BURST_COLORS = {
  [DIFFICULTY_IDS.EASY]: {
    color: "#31e981",
    rgb: "49 233 129",
  },
  [DIFFICULTY_IDS.NORMAL]: {
    color: "#ffbd2f",
    rgb: "255 189 47",
  },
  [DIFFICULTY_IDS.HARD]: {
    color: "#ff3f46",
    rgb: "255 63 70",
  },
};
const CARD_RESIZE_DURATION_MS = 700;
const DIFFICULTY_BURST_LIFETIME_MS = 3900;
const ADMIN_TAP_WINDOW_MS = 5000;
const ADMIN_TAP_COUNT = 5;
const ADMIN_SETTLE_DELAY_MS = 3000;
const GAME_MODE_LOCKED_DIFFICULTIES = GAME_MODE_OPTIONS.reduce((locks, option) => {
  if (option.lockedDifficultyId) {
    locks[option.id] = option.lockedDifficultyId;
  }

  return locks;
}, {});

function waitForCardResize() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, CARD_RESIZE_DURATION_MS);
  });
}

export default function HomeCard({
  initialView = "home",
  gameFamily = "color",
  initialDifficulty = null,
  initialGameMode = null,
  initialRoundCount = null,
  initialHintsEnabled = null,
}) {
  const { locale, t } = useTranslation();
  const router = useRouter();
  const cleanGameFamily = normalizeGameFamily(gameFamily);
  const defaultGameMode = getDefaultGameModeForFamily(cleanGameFamily);
  const defaultDifficulty =
    GAME_MODE_LOCKED_DIFFICULTIES[defaultGameMode] || DEFAULT_DIFFICULTY_ID;
  const singleplayerGameModeOptions = getAvailableGameModeOptions(
    GAME_MODE_OPTIONS.filter((option) => !option.multiplayerOnly),
    cleanGameFamily,
  );
  const {
    cancelUnlockRequest,
    disableAdmin,
    enableAdmin,
    enabled: isAdminModeEnabled,
    protectorRequestId,
    requestProtector,
  } = useAdminMode();
  const [view, setView] = useState(initialView);
  const [difficulty, setDifficulty] = useState(initialDifficulty || defaultDifficulty);
  const [gameMode, setGameMode] = useState(initialGameMode || defaultGameMode);
  const [roundCount, setRoundCount] = useState(initialRoundCount || DEFAULT_ROUND_COUNT);
  const [isMultiplayerTallStep, setIsMultiplayerTallStep] = useState(false);
  const [difficultyBurst, setDifficultyBurst] = useState(null);
  const [isAdminProtectorVisible, setIsAdminProtectorVisible] = useState(false);
  const [notification, setNotification] = useState(null);
  const contentRef = useRef(null);
  const difficultyBurstTimerRef = useRef(null);
  const adminTapTimesRef = useRef([]);
  const adminSettleTimerRef = useRef(null);
  const isChangingViewRef = useRef(false);
  const lastProtectorRequestRef = useRef(0);

  const isSingleplayer = view === "singleplayer";
  const isMultiplayer = view === "multiplayer";
  const isComingSoonFamily = cleanGameFamily === GAME_FAMILY_IDS.BRAND;
  const showHowItWorksInCard =
    cleanGameFamily === GAME_FAMILY_IDS.CARTOON && view === "home";
  const isExpandedCard = isMultiplayer && isMultiplayerTallStep;
  const cardHeight = useResponsiveCardHeight(isExpandedCard);
  const cardStyle = cardHeight ? { height: cardHeight } : undefined;
  const homeSection = t(`home.sections.${cleanGameFamily}`);
  const homeTitle = homeSection?.title || t(`gameFamily.${cleanGameFamily}`);
  const homeParagraphs = Array.isArray(homeSection?.paragraphs)
    ? homeSection.paragraphs
    : t("home.paragraphs");
  const adminEnabledMessage =
    locale === "tr" ? "Admin modu acildi." : "Admin mode enabled.";

  useAppChromeHidden(isSingleplayer || isMultiplayer);
  useCartoonAssetPreload(
    cleanGameFamily === GAME_FAMILY_IDS.CARTOON,
    undefined,
    "scene",
  );
  useFlagFullscreenLock(
    cleanGameFamily === GAME_FAMILY_IDS.FLAG ||
      cleanGameFamily === GAME_FAMILY_IDS.CARTOON ||
      gameMode === GAME_MODE_IDS.FLAG ||
      gameMode === GAME_MODE_IDS.CARTOON,
  );
  useMusicScene(MUSIC_SCENES.MENU);
  useScreenReveal(
    contentRef,
    [view, cleanGameFamily, isAdminProtectorVisible, locale],
    {
      delay: isAdminProtectorVisible ? 90 : 0,
    },
  );

  useEffect(() => {
    clearAllGameSessions();
  }, []);

  useEffect(() => {
    return () => {
      if (difficultyBurstTimerRef.current) {
        window.clearTimeout(difficultyBurstTimerRef.current);
      }

      if (adminSettleTimerRef.current) {
        window.clearTimeout(adminSettleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!protectorRequestId) return;
    if (lastProtectorRequestRef.current === protectorRequestId) return;

    lastProtectorRequestRef.current = protectorRequestId;

    if (isAdminProtectorVisible) return;

    let isCancelled = false;

    const showProtector = async () => {
      await playScreenFadeOut(contentRef, { duration: 0.28 });
      if (isCancelled) return;
      setIsAdminProtectorVisible(true);
    };

    void showProtector();

    return () => {
      isCancelled = true;
    };
  }, [isAdminProtectorVisible, protectorRequestId]);

  const changeView = async (nextView) => {
    if (isAdminProtectorVisible) return;
    if (nextView === view || isChangingViewRef.current) return;

    isChangingViewRef.current = true;
    await playScreenFadeOut(contentRef);

    if (isExpandedCard) {
      setIsMultiplayerTallStep(false);
      await waitForCardResize();
    }

    setView(nextView);
    isChangingViewRef.current = false;
  };

  const triggerDifficultyFeedback = (nextDifficulty, optionIndex = 1) => {
    const burst =
      DIFFICULTY_BURST_COLORS[nextDifficulty] ||
      DIFFICULTY_BURST_COLORS[DIFFICULTY_IDS.NORMAL];

    if (difficultyBurstTimerRef.current) {
      window.clearTimeout(difficultyBurstTimerRef.current);
    }

    setDifficultyBurst({
      id: nextDifficulty,
      color: burst.color,
      rgb: burst.rgb,
      key: `${nextDifficulty}-${optionIndex}-${Date.now()}`,
    });

    difficultyBurstTimerRef.current = window.setTimeout(() => {
      setDifficultyBurst(null);
      difficultyBurstTimerRef.current = null;
    }, DIFFICULTY_BURST_LIFETIME_MS);
  };

  const handleGameModeChange = (nextGameMode) => {
    setGameMode(nextGameMode);

    const lockedDifficulty = GAME_MODE_LOCKED_DIFFICULTIES[nextGameMode];

    if (lockedDifficulty && difficulty !== lockedDifficulty) {
      setDifficulty(lockedDifficulty);
      triggerDifficultyFeedback(lockedDifficulty, 0);
    }
  };

  const handleDifficultyChange = (nextDifficulty) => {
    if (GAME_MODE_LOCKED_DIFFICULTIES[gameMode]) return;

    setDifficulty(nextDifficulty);
  };

  const handleAdminUnlock = async () => {
    enableAdmin();
    setNotification({
      id: `admin-${Date.now()}`,
      message: adminEnabledMessage,
      variant: "admin",
    });
    await playScreenFadeOut(contentRef, { duration: 0.24 });
    setIsAdminProtectorVisible(false);
  };

  const handleAdminCancel = async () => {
    cancelUnlockRequest();
    await playScreenFadeOut(contentRef, { duration: 0.22 });
    setIsAdminProtectorVisible(false);
  };

  const handleAdminTriggerTap = () => {
    if (view !== "home" || isAdminProtectorVisible) return;

    if (adminSettleTimerRef.current) {
      window.clearTimeout(adminSettleTimerRef.current);
      adminSettleTimerRef.current = null;
    }

    const now = Date.now();
    adminTapTimesRef.current = [...adminTapTimesRef.current, now].filter(
      (time) => now - time <= ADMIN_TAP_WINDOW_MS,
    );

    if (adminTapTimesRef.current.length < ADMIN_TAP_COUNT) return;

    adminTapTimesRef.current = [];

    adminSettleTimerRef.current = window.setTimeout(() => {
      adminSettleTimerRef.current = null;

      if (isAdminModeEnabled) {
        disableAdmin();
        return;
      }

      requestProtector();
    }, ADMIN_SETTLE_DELAY_MS);
  };

  const handleHowItWorksClick = async () => {
    if (isChangingViewRef.current) return;

    isChangingViewRef.current = true;
    const introCard = document.querySelector("[data-intro-card-target]");

    try {
      sessionStorage.setItem("huestima-how-it-works-entry", "cartoon");
      await playScreenFadeOut(contentRef, { duration: 0.24 });

      if (introCard) {
        await new Promise((resolve) => {
          gsap.set(introCard, {
            autoAlpha: 1,
            transformOrigin: "center center",
          });
          gsap.to(introCard, {
            scale: 0.001,
            duration: 0.54,
            ease: "power3.inOut",
            overwrite: "auto",
            onComplete: resolve,
          });
        });
      }

      router.push("/how-it-works");
    } catch {
      // Restore the menu if navigation cannot complete after the fade begins.
      gsap.set(contentRef.current, { autoAlpha: 1 });
      gsap.set(introCard, { clearProps: "opacity,visibility,transform" });
      isChangingViewRef.current = false;
    }
  };

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        data-intro-card-target
        className={`home-card relative isolate flex w-full max-w-125 flex-col overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[0_18px_38px_rgba(0,0,0,0.28),0_8px_18px_rgba(0,0,0,0.18)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.56),0_8px_18px_rgba(0,0,0,0.36)] sm:rounded-[26px] sm:p-8 ${
          isComingSoonFamily ? "home-card--coming-soon" : ""
        }`}
        style={cardStyle}
      >
        <PushNotification
          notification={notification}
          onClose={() => setNotification(null)}
        />

        {difficultyBurst && (
          <span
            key={difficultyBurst.key}
            className={`difficulty-burst difficulty-burst--${difficultyBurst.id}`}
            style={{
              "--difficulty-burst-color": difficultyBurst.color,
              "--difficulty-burst-rgb": difficultyBurst.rgb,
            }}
            aria-hidden="true"
          />
        )}

        {(isSingleplayer || isMultiplayer) && !isAdminProtectorVisible && (
          <button
            data-game-mode-shock-target
            type="button"
            aria-label={t("common.backHome")}
            onClick={() => changeView("home")}
            className="solo-close-button absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8 sm:top-8 sm:size-9"
          >
            <X className="size-6 sm:size-[26px]" strokeWidth={1.7} />
          </button>
        )}

        <div
          ref={contentRef}
          data-route-transition-scope
          className={`home-card-content home-card-content--${view} relative z-10 flex h-full flex-col`}
        >
          {isAdminProtectorVisible ? (
            <AdminProtectorCard
              onCancel={handleAdminCancel}
              onUnlock={handleAdminUnlock}
            />
          ) : view === "home" ? (
            <>
              {isComingSoonFamily ? (
                <ComingSoonCard
                  title={homeTitle}
                  paragraphs={homeParagraphs}
                />
              ) : (
                <>
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    onPointerDown={handleAdminTriggerTap}
                    data-sound="off"
                    className="absolute right-0 bottom-0 z-30 size-16 cursor-default opacity-0 focus:outline-none sm:size-20"
                  />

                  <div data-screen-reveal className="home-copy max-w-[23.5rem]">
                    <h1 className="text-5xl font-semibold leading-[0.9] tracking-normal text-white sm:text-[4.65rem]">
                      {homeTitle}
                    </h1>

                    {homeParagraphs.map((paragraph, index) => (
                      <p
                        key={paragraph}
                        className={`${
                          index === 0 ? "mt-5" : "mt-4"
                        } text-[0.95rem] font-medium leading-[1.22] text-white/82 sm:text-base`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div
                    data-screen-reveal
                    className="home-actions mt-auto self-start"
                  >
                    <ModeSelector
                      onSingleplayer={() => changeView("singleplayer")}
                      onMultiplayer={() => changeView("multiplayer")}
                    />
                  </div>

                  {showHowItWorksInCard ? (
                    <div data-screen-reveal className="absolute right-0 bottom-0 z-40">
                      <button
                        type="button"
                        data-sound="off"
                        onClick={() => {
                          void handleHowItWorksClick();
                        }}
                        className="border-0 bg-transparent p-0 text-[11px] font-medium lowercase tracking-wider text-white/45 no-underline outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        {t("howItWorks.footerLink")}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : isSingleplayer ? (
            <SingleplayerCard
              difficulty={difficulty}
              gameMode={gameMode}
              gameFamily={cleanGameFamily}
              gameModeOptions={singleplayerGameModeOptions}
              playPath={getGameFamilyHref(cleanGameFamily, "singleplayer")}
              roundCount={roundCount}
              hintsEnabled={initialHintsEnabled ?? true}
              onDifficultyChange={handleDifficultyChange}
              onDifficultyFeedback={triggerDifficultyFeedback}
              onGameModeChange={handleGameModeChange}
              onRoundCountChange={setRoundCount}
            />
          ) : (
            <MultiplayerCard
              gameFamily={cleanGameFamily}
              onTallStepChange={setIsMultiplayerTallStep}
              initialDifficulty={initialDifficulty || defaultDifficulty}
              initialGameMode={initialGameMode || defaultGameMode}
              initialHintsEnabled={initialHintsEnabled ?? true}
            />
          )}
        </div>
      </section>
    </main>
  );
}
