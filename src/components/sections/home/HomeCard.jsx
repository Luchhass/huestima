"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import {
  clearAdminHomeReturn,
  clearFooterReturn,
  hasPendingAdminHomeReturn,
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
  const isFooterReturnRef = useRef(false);
  const [isAdminReturnPending] = useState(() => hasPendingAdminHomeReturn());
  const difficultyBurstTimerRef = useRef(null);
  const isChangingViewRef = useRef(false);

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
  useMusicScene(MUSIC_SCENES.MENU);
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
                    className="home-actions mt-auto self-start"
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
      </section>
    </main>
  );
}
