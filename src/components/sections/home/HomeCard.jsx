"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import ModeSelector from "./ModeSelector";
import MultiplayerCard from "./MultiplayerCard";
import SingleplayerCard from "./SingleplayerCard";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useTranslation } from "@/hooks/useLanguage";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { playScreenFadeOut, useScreenReveal } from "@/hooks/useScreenReveal";
import {
  APP_NAME,
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  DIFFICULTY_IDS,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";

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

export default function HomeCard({ initialView = "home" }) {
  const { t } = useTranslation();
  const [view, setView] = useState(initialView);
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY_ID);
  const [gameMode, setGameMode] = useState(DEFAULT_GAME_MODE_ID);
  const [isMultiplayerTallStep, setIsMultiplayerTallStep] = useState(false);
  const [difficultyBurst, setDifficultyBurst] = useState(null);
  const contentRef = useRef(null);
  const isChangingViewRef = useRef(false);

  const isSingleplayer = view === "singleplayer";
  const isMultiplayer = view === "multiplayer";
  const isExpandedCard = isMultiplayer && isMultiplayerTallStep;
  const cardHeight = useResponsiveCardHeight(isExpandedCard);
  const cardStyle = cardHeight ? { height: cardHeight } : undefined;

  useAppChromeHidden(isSingleplayer || isMultiplayer);
  useScreenReveal(contentRef, [view]);

  const changeView = async (nextView) => {
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

    setDifficultyBurst({
      id: nextDifficulty,
      color: burst.color,
      rgb: burst.rgb,
      key: `${nextDifficulty}-${optionIndex}-${Date.now()}`,
    });
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
        className="home-card relative isolate flex w-full max-w-125 flex-col overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[0_18px_38px_rgba(0,0,0,0.28),0_8px_18px_rgba(0,0,0,0.18)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.56),0_8px_18px_rgba(0,0,0,0.36)] sm:rounded-[26px] sm:p-8"
        style={cardStyle}
      >
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
          className={`home-card-content home-card-content--${view} relative z-10 flex h-full flex-col`}
        >
          {view === "home" ? (
            <>
              <div data-screen-reveal className="home-copy max-w-[23.5rem]">
                <h1
                  className="text-5xl font-semibold leading-[0.9] tracking-normal text-white sm:text-[4.65rem]"
                >
                  {APP_NAME}
                </h1>

                {t("home.paragraphs").map((paragraph, index) => (
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
            </>
          ) : isSingleplayer ? (
            <SingleplayerCard
              difficulty={difficulty}
              gameMode={gameMode}
              onDifficultyChange={handleDifficultyChange}
              onDifficultyFeedback={triggerDifficultyFeedback}
              onGameModeChange={handleGameModeChange}
            />
          ) : (
            <MultiplayerCard
              onTallStepChange={setIsMultiplayerTallStep}
            />
          )}
        </div>
      </section>
    </main>
  );
}
