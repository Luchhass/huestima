"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import gsap from "gsap";
import PushNotification from "@/components/ui/PushNotification";
import ModeSelector from "./ModeSelector";
import MultiplayerCard from "./MultiplayerCard";
import SingleplayerCard from "./SingleplayerCard";
import CartoonPoolPicker from "@/components/ui/CartoonPoolPicker";
import FlagPoolPicker from "@/components/ui/FlagPoolPicker";
import TeamPoolPicker from "@/components/ui/TeamPoolPicker";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { clearAllGameSessions } from "@/hooks/useGameSession";
import { MUSIC_SCENES, useMusicScene } from "@/hooks/useMusicScene";
import { useTranslation } from "@/hooks/useLanguage";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { useSiteOperations } from "@/hooks/useSiteOperations";
import {
  playScreenFadeOut,
  SCREEN_FADE_OUT_EVENT,
  SCREEN_REVEAL_REPLAY_EVENT,
  SCREEN_REVEAL_START_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import {
  clearAdminHomeReturn,
  clearDownloadReturn,
  clearFooterReturn,
  hasPendingAdminHomeReturn,
  hasPendingDownloadReturn,
  hasPendingFooterReturn,
  playAdminHomeReturnEntry,
  playFooterReturnEntry,
} from "@/hooks/useFooterPageTransition";
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
import { FLAG_DIFFICULTY_OPTIONS } from "@/lib/flags";
import { CARTOON_PACKS } from "@/lib/cartoons";
import { TEAM_OPTIONS } from "@/lib/teams";

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
  initialFlagDifficulty = null,
  initialFlagDifficulties = null,
  initialCartoonIds = null,
  initialTeamIds = null,
}) {
  const { locale, t } = useTranslation();
  const { operations, ready: operationsReady } = useSiteOperations();
  const multiplayerEnabled =
    operationsReady && operations.multiplayerEnabled;
  const cleanGameFamily = normalizeGameFamily(gameFamily);
  const defaultGameMode = getDefaultGameModeForFamily(cleanGameFamily);
  const defaultDifficulty =
    GAME_MODE_LOCKED_DIFFICULTIES[defaultGameMode] || DEFAULT_DIFFICULTY_ID;
  const singleplayerGameModeOptions = getAvailableGameModeOptions(
    GAME_MODE_OPTIONS.filter((option) => !option.multiplayerOnly),
    cleanGameFamily,
  );
  const [view, setView] = useState(initialView);
  const [difficulty, setDifficulty] = useState(initialDifficulty || defaultDifficulty);
  const [gameMode, setGameMode] = useState(initialGameMode || defaultGameMode);
  const [roundCount, setRoundCount] = useState(initialRoundCount || DEFAULT_ROUND_COUNT);
  const [flagDifficulty, setFlagDifficulty] = useState(initialFlagDifficulty || "starter");
  const [flagDifficulties, setFlagDifficulties] = useState(
    initialFlagDifficulties ?? (initialFlagDifficulty
      ? [initialFlagDifficulty]
      : ["starter"]),
  );
  const [cartoonIds, setCartoonIds] = useState(
    initialCartoonIds ?? CARTOON_PACKS.flatMap(({ itemIds }) => itemIds),
  );
  const [teamIds, setTeamIds] = useState(
    initialTeamIds ?? TEAM_OPTIONS.map(({ id }) => id),
  );
  const [cartoonPoolReturnView, setCartoonPoolReturnView] = useState("singleplayer");
  const [isMultiplayerTallStep, setIsMultiplayerTallStep] = useState(false);
  const [difficultyBurst, setDifficultyBurst] = useState(null);
  const [notification, setNotification] = useState(null);
  const contentRef = useRef(null);
  const cardRef = useRef(null);
  const stickerRef = useRef(null);
  const isFooterReturnRef = useRef(false);
  const [isAdminReturnPending] = useState(() => hasPendingAdminHomeReturn());
  const difficultyBurstTimerRef = useRef(null);
  const isChangingViewRef = useRef(false);
  const colorWaveGradientRef = useRef(null);

  const isSingleplayer = view === "singleplayer";
  const isMultiplayer = view === "multiplayer";
  const isCartoonPool = view === "cartoonPool";
  const isFlagPool = view === "flagPool";
  const isTeamPool = view === "teamPool";
  const isExpandedCard = isMultiplayer && isMultiplayerTallStep;
  const cardHeight = useResponsiveCardHeight(
    isExpandedCard || isCartoonPool || isFlagPool,
  );
  const cardStyle = cardHeight ? { height: cardHeight } : undefined;
  const homeSection = t(`home.sections.${cleanGameFamily}`);
  const homeTitle = homeSection?.title || t(`gameFamily.${cleanGameFamily}`);
  const homeParagraphs = Array.isArray(homeSection?.paragraphs)
    ? homeSection.paragraphs
    : t("home.paragraphs");

  if (typeof window !== "undefined") {
    isFooterReturnRef.current ||= hasPendingFooterReturn();
  }

  useAppChromeHidden(isSingleplayer || isMultiplayer || isCartoonPool || isFlagPool || isTeamPool);
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
  useMusicScene(
    cleanGameFamily === GAME_FAMILY_IDS.CARTOON
      ? MUSIC_SCENES.CARTOON_MENU
      : MUSIC_SCENES.MENU,
  );

  // Animate the RGB spectrum from JavaScript instead of SVG SMIL. SMIL
  // gradient transforms are frozen by several mobile WebViews/Safari builds.
  // A single rAF loop is lightweight and works consistently across browsers.
  useEffect(() => {
    if (cleanGameFamily !== GAME_FAMILY_IDS.COLOR || !colorWaveGradientRef.current) {
      return undefined;
    }

    const gradient = colorWaveGradientRef.current;
    const duration = 24000;
    let startedAt = null;
    let frameId = 0;

    const tick = (timestamp) => {
      startedAt ??= timestamp;
      const progress = ((timestamp - startedAt) % duration) / duration;
      gradient.setAttribute("gradientTransform", `translate(${(-1400 + progress * 1400).toFixed(2)} 0)`);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [cleanGameFamily]);
  useScreenReveal(
    contentRef,
    [view, cleanGameFamily, locale],
    {
      // Footer return state is intentionally read once to defer the entry reveal.
      // eslint-disable-next-line react-hooks/refs
      defer: isFooterReturnRef.current || isAdminReturnPending,
    },
  );

  useLayoutEffect(() => {
    const sticker = stickerRef.current;
    if (!sticker) return undefined;

    let tween = null;

    const stopTween = () => {
      tween?.kill();
      tween = null;
    };

    const handleRevealStart = (event) => {
      if (view !== "home") return;

      stopTween();

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(sticker, { autoAlpha: 1, yPercent: 0 });
        return;
      }

      tween = gsap.fromTo(
        sticker,
        { autoAlpha: 1, yPercent: 110 },
        {
          autoAlpha: 1,
          yPercent: 0,
          duration: event.detail?.duration ?? 0.9,
          ease: event.detail?.ease ?? "power4.out",
          overwrite: true,
        },
      );
    };

    const handleFadeOut = (event) => {
      if (view !== "home") return;

      stopTween();
      tween = gsap.to(sticker, {
        autoAlpha: 0,
        duration: event.detail?.duration ?? 0.24,
        ease: event.detail?.ease ?? "power2.out",
        overwrite: true,
      });
    };

    gsap.set(sticker, { autoAlpha: 0 });
    window.addEventListener(SCREEN_REVEAL_START_EVENT, handleRevealStart);
    window.addEventListener(SCREEN_FADE_OUT_EVENT, handleFadeOut);

    return () => {
      window.removeEventListener(SCREEN_REVEAL_START_EVENT, handleRevealStart);
      window.removeEventListener(SCREEN_FADE_OUT_EVENT, handleFadeOut);
      stopTween();
    };
  }, [cleanGameFamily, view]);

  useLayoutEffect(() => {
    if (!hasPendingAdminHomeReturn()) return undefined;

    const card = cardRef.current;
    if (!card) return undefined;

    let active = true;

    void playAdminHomeReturnEntry(card).then(() => {
      if (!active) return;

      clearAdminHomeReturn();
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    });

    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!hasPendingDownloadReturn()) return undefined;

    const card = cardRef.current;
    if (!card) return undefined;

    let active = true;

    void playFooterReturnEntry(card, { scaleCard: false }).then(() => {
      if (!active) return;

      clearDownloadReturn();
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    });

    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!hasPendingFooterReturn()) return undefined;

    const card = cardRef.current;
    if (!card) return undefined;

    let active = true;

    void playFooterReturnEntry(card).then(() => {
      if (!active) return;

      isFooterReturnRef.current = false;
      clearFooterReturn();
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    clearAllGameSessions();
  }, []);

  useEffect(() => {
    return () => {
      if (difficultyBurstTimerRef.current) {
        window.clearTimeout(difficultyBurstTimerRef.current);
      }

    };
  }, []);

  const changeView = useCallback(async (nextView) => {
    if (nextView === view || isChangingViewRef.current) return;

    isChangingViewRef.current = true;
    await playScreenFadeOut(contentRef);

    if (isExpandedCard) {
      setIsMultiplayerTallStep(false);
      await waitForCardResize();
    }

    setView(nextView);
    isChangingViewRef.current = false;
  }, [isExpandedCard, view]);

  useEffect(() => {
    const isMultiplayerOnlyView =
      isMultiplayer ||
      ((isCartoonPool || isFlagPool || isTeamPool) &&
        cartoonPoolReturnView === "multiplayer");

    if (!operationsReady || multiplayerEnabled || !isMultiplayerOnlyView) return;
    const redirectId = window.setTimeout(() => {
      void changeView("home");
    }, 0);

    return () => window.clearTimeout(redirectId);
  }, [
    changeView,
    isCartoonPool,
    isFlagPool,
    isMultiplayer,
    isTeamPool,
    multiplayerEnabled,
    operationsReady,
    cartoonPoolReturnView,
  ]);

  const openCartoonPool = async () => {
    if (view !== "singleplayer" && view !== "multiplayer") return;
    setCartoonPoolReturnView(view);
    await changeView("cartoonPool");
  };

  const openFlagPool = async () => {
    if (view !== "singleplayer" && view !== "multiplayer") return;
    setCartoonPoolReturnView(view);
    await changeView("flagPool");
  };
  const openTeamPool = async () => { if (view !== "singleplayer" && view !== "multiplayer") return; setCartoonPoolReturnView(view); await changeView("teamPool"); };

  const closeCartoonPool = async () => {
    await changeView(cartoonPoolReturnView);
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

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        data-intro-card-target
        ref={cardRef}
      className="home-card relative isolate flex w-full max-w-125 flex-col overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[var(--app-card-shadow)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] sm:rounded-[26px] sm:p-8"
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

        {(isSingleplayer || isMultiplayer) && (
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
          {view === "home" ? (
            <>
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
                    className="home-actions relative z-10 mt-auto self-start"
                  >
                    <ModeSelector
                      onSingleplayer={() => changeView("singleplayer")}
                      onMultiplayer={() =>
                        multiplayerEnabled && changeView("multiplayer")
                      }
                      multiplayerEnabled={multiplayerEnabled}
                    />
                  </div>

            </>
          ) : isCartoonPool ? (
            <CartoonPoolPicker
              value={cartoonIds}
              onChange={setCartoonIds}
              onDone={closeCartoonPool}
            />
          ) : isFlagPool ? (
            <FlagPoolPicker
              value={flagDifficulties}
              onChange={setFlagDifficulties}
              onDone={() => changeView(cartoonPoolReturnView)}
            />
          ) : isTeamPool ? (
            <TeamPoolPicker value={teamIds} onChange={setTeamIds} onDone={() => changeView(cartoonPoolReturnView)} />
          ) : isSingleplayer ? (
            <SingleplayerCard
              difficulty={difficulty}
              gameMode={gameMode}
              gameFamily={cleanGameFamily}
              gameModeOptions={singleplayerGameModeOptions}
              playPath={getGameFamilyHref(cleanGameFamily, "singleplayer")}
              roundCount={roundCount}
              hintsEnabled={initialHintsEnabled ?? true}
              flagDifficulty={flagDifficulty}
              onFlagDifficultyChange={setFlagDifficulty}
              flagDifficulties={flagDifficulties}
              onFlagDifficultiesChange={setFlagDifficulties}
              cartoonIds={cartoonIds}
              onCartoonIdsChange={setCartoonIds}
              onOpenCartoonPool={openCartoonPool}
              onOpenFlagPool={openFlagPool}
              teamIds={teamIds}
              onOpenTeamPool={openTeamPool}
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
              initialRoundCount={roundCount}
              initialHintsEnabled={initialHintsEnabled ?? true}
              initialFlagDifficulty={flagDifficulty}
              initialFlagDifficulties={flagDifficulties}
              cartoonIds={cartoonIds}
              onCartoonIdsChange={setCartoonIds}
              onOpenCartoonPool={openCartoonPool}
              onOpenFlagPool={openFlagPool}
              teamIds={teamIds}
              onOpenTeamPool={openTeamPool}
            />
          )}
        </div>

        {(cleanGameFamily === GAME_FAMILY_IDS.TEAM ||
          cleanGameFamily === GAME_FAMILY_IDS.CARTOON ||
          cleanGameFamily === GAME_FAMILY_IDS.BRAND ||
          cleanGameFamily === GAME_FAMILY_IDS.FLAG ||
          cleanGameFamily === GAME_FAMILY_IDS.COLOR) && (
          <div
            ref={stickerRef}
            aria-hidden="true"
            className={`team-home-sticker pointer-events-none absolute z-0 select-none opacity-0 will-change-[opacity,transform] ${
              cleanGameFamily === GAME_FAMILY_IDS.CARTOON
                ? "-bottom-[140px] right-[-52px] w-[268px] sm:-bottom-[170px] sm:right-[-44px] sm:w-[335px]"
                : cleanGameFamily === GAME_FAMILY_IDS.COLOR
                  ? "inset-0 h-full w-full"
                : cleanGameFamily === GAME_FAMILY_IDS.FLAG
                  ? "inset-0 h-full w-full"
                : cleanGameFamily === GAME_FAMILY_IDS.BRAND
                  ? "bottom-0 right-0 h-[280px] w-[300px] sm:h-[330px] sm:w-[350px]"
                  : "-bottom-8 right-4 w-40 sm:-bottom-12 sm:right-6 sm:w-56"
            }`}
          >
            {cleanGameFamily === GAME_FAMILY_IDS.COLOR ? (
              <svg
                viewBox="0 0 500 500"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full"
                aria-hidden="true"
              >
                <defs>
                  <path
                    id="home-color-wave-shape"
                    d="M 90 520 C 100 474 112 438 148 428 C 186 418 207 399 232 370 C 260 337 285 307 319 315 C 356 325 379 338 410 312 C 441 286 450 251 476 237 C 494 228 510 238 525 251 L 525 525 L 90 525 Z"
                  >
                  </path>
                  <filter
                    id="home-color-wave-soften"
                    x="-32%"
                    y="-32%"
                    width="164%"
                    height="164%"
                  >
                    <feGaussianBlur stdDeviation="22" />
                  </filter>
                  <mask id="home-color-wave-mask" maskUnits="userSpaceOnUse">
                    <rect width="500" height="500" fill="black" />
                    <use
                      href="#home-color-wave-shape"
                      fill="white"
                      filter="url(#home-color-wave-soften)"
                    />
                  </mask>
                  <linearGradient
                    id="home-color-rgb-spectrum"
                    ref={colorWaveGradientRef}
                    x1="0"
                    y1="0"
                    x2="1400"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                    spreadMethod="repeat"
                    colorInterpolation="linearRGB"
                  >
                    <stop offset="0" stopColor="#d600ff" />
                    <stop offset="0.125" stopColor="#ff1744" />
                    <stop offset="0.25" stopColor="#ff7a00" />
                    <stop offset="0.375" stopColor="#ffe600" />
                    <stop offset="0.5" stopColor="#21e65b" />
                    <stop offset="0.625" stopColor="#00d9ff" />
                    <stop offset="0.75" stopColor="#176bff" />
                    <stop offset="0.875" stopColor="#7347ff" />
                    <stop offset="1" stopColor="#d600ff" />
                  </linearGradient>
                </defs>
                <rect
                  width="500"
                  height="500"
                  fill="url(#home-color-rgb-spectrum)"
                  mask="url(#home-color-wave-mask)"
                >
                </rect>
              </svg>
            ) : cleanGameFamily === GAME_FAMILY_IDS.FLAG ? (
              <>
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 118% 108% at 102% 104%, rgba(227,10,23,1) 0%, rgba(227,10,23,0.94) 32%, rgba(227,10,23,0.68) 54%, rgba(227,10,23,0.34) 72%, rgba(227,10,23,0.1) 86%, rgba(227,10,23,0) 96%)",
                  }}
                />
                <Image
                  src="/game-modes/flag/decorative/turkey-crescent-star.png"
                  alt=""
                  width={1413}
                  height={1064}
                  sizes="(max-width: 640px) 230px, 290px"
                  className="absolute -bottom-12 -right-9 w-[230px] max-w-none sm:-bottom-16 sm:-right-10 sm:w-[290px]"
                  priority
                />
              </>
            ) : cleanGameFamily === GAME_FAMILY_IDS.BRAND ? (
              <>
                <Image
                  src="/game-modes/brand/brand-logos/google-chrome.png"
                  alt=""
                  width={1024}
                  height={1024}
                  sizes="(max-width: 640px) 72px, 86px"
                  className="absolute bottom-16 right-[120px] w-[72px] -rotate-[17deg] drop-shadow-[0_11px_16px_rgba(0,0,0,0.42)] sm:bottom-[76px] sm:right-[142px] sm:w-[86px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/spotify.png"
                  alt=""
                  width={739}
                  height={709}
                  sizes="(max-width: 640px) 72px, 86px"
                  className="absolute bottom-12 right-[62px] z-20 w-[72px] rotate-[10deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-14 sm:right-[76px] sm:w-[86px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/snapchat.png"
                  alt=""
                  width={1500}
                  height={1500}
                  sizes="(max-width: 640px) 68px, 82px"
                  className="absolute bottom-[105px] right-8 z-20 w-[68px] rotate-[18deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-[120px] sm:right-9 sm:w-[82px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/discord.png"
                  alt=""
                  width={900}
                  height={900}
                  sizes="(max-width: 640px) 92px, 112px"
                  className="absolute -bottom-1 right-[135px] w-[92px] -rotate-[13deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:-bottom-1 sm:right-[158px] sm:w-28"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/netflix.png"
                  alt=""
                  width={4096}
                  height={4096}
                  sizes="(max-width: 640px) 84px, 102px"
                  className="absolute bottom-9 -right-2 z-10 w-[84px] -rotate-[8deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-11 sm:-right-1.5 sm:w-[102px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/instagram.png"
                  alt=""
                  width={4096}
                  height={4096}
                  sizes="(max-width: 640px) 82px, 102px"
                  className="absolute bottom-[166px] -right-1 w-[82px] -rotate-[14deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:bottom-[188px] sm:right-0 sm:w-[102px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/facebook.png"
                  alt=""
                  width={400}
                  height={400}
                  sizes="(max-width: 640px) 168px, 202px"
                  className="absolute -bottom-[60px] -right-8 w-[168px] rotate-[7deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:-bottom-[72px] sm:-right-9 sm:w-[202px]"
                  priority
                />
              </>
            ) : cleanGameFamily === GAME_FAMILY_IDS.CARTOON ? (
              <Image
                src="/game-modes/cartoon/ben-10/ben-home-character.png"
                alt=""
                width={1101}
                height={1600}
                sizes="(max-width: 640px) 268px, 335px"
                className="h-auto w-full drop-shadow-[0_14px_24px_rgba(0,0,0,0.38)]"
                priority
              />
            ) : (
              <>
                <Image
                  src="/game-modes/team/team-logos/fenerbahce.png"
                  alt=""
                  width={3000}
                  height={3000}
                  sizes="(max-width: 640px) 160px, 224px"
                  className="relative z-10 h-auto w-full -rotate-[8deg] drop-shadow-[0_14px_24px_rgba(0,0,0,0.38)]"
                  priority
                />
                <Image
                  src="/game-modes/team/team-logos/galatasaray.png"
                  alt=""
                  width={3000}
                  height={3000}
                  sizes="(max-width: 640px) 36px, 44px"
                  className="absolute -right-1 top-3 z-0 h-auto w-9 rotate-[8deg] drop-shadow-[0_8px_13px_rgba(0,0,0,0.45)] sm:-right-1 sm:top-4 sm:w-11"
                  priority
                />
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
