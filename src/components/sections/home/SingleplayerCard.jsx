"use client";

import { useRef } from "react";
import Link from "next/link";
import DifficultySwitch from "@/components/ui/DifficultySwitch";
import GameModePicker from "@/components/ui/GameModePicker";
import { useGameModeShock } from "@/hooks/useGameModeShock";
import { useTranslation } from "@/hooks/useLanguage";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import { getGameModeOption } from "@/lib/gameMode";

const SINGLEPLAYER_GAME_MODE_OPTIONS = GAME_MODE_OPTIONS.filter(
  (option) => !option.multiplayerOnly,
);

export default function SingleplayerCard({
  difficulty,
  gameMode,
  onDifficultyChange,
  onDifficultyFeedback,
  onGameModeChange,
}) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);
  const description = `${t(
    `setup.singleCopy.${gameMode || DEFAULT_GAME_MODE_ID}`,
  )} ${t(`setup.difficultyCopy.${difficulty || DEFAULT_DIFFICULTY_ID}`)}`;
  const difficultyLocked = Boolean(getGameModeOption(gameMode)?.lockedDifficultyId);

  useGameModeShock(scopeRef, gameMode);

  return (
    <div ref={scopeRef} className="home-view-panel flex h-full flex-col">
      <div data-screen-reveal className="home-view-copy max-w-[23rem] pr-10">
        <h1
          data-game-mode-shock-target
          className="text-[clamp(2.15rem,10.5vw,3.15rem)] font-semibold lowercase leading-[0.88] tracking-normal text-white sm:text-[4.05rem]"
        >
          {t("setup.singleplayer")}
        </h1>

        <p
          data-game-mode-shock-target
          className="mt-4 text-[0.92rem] font-medium leading-[1.22] text-white/82 sm:text-[0.98rem]"
        >
          {description}
        </p>
      </div>

      <div data-screen-reveal className="home-view-actions mt-auto w-full">
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:gap-3">
          <div data-game-mode-shock-target className="min-w-0">
            <GameModePicker
              value={gameMode}
              onChange={onGameModeChange}
              options={SINGLEPLAYER_GAME_MODE_OPTIONS}
            />
          </div>

          <div data-game-mode-shock-target className="min-w-0">
            <DifficultySwitch
              value={difficulty}
              onChange={onDifficultyChange}
              onSelectFeedback={onDifficultyFeedback}
              disabled={difficultyLocked}
            />
          </div>
        </div>
      </div>

      <div data-screen-reveal className="home-view-actions mt-3">
        <div className="w-full">
          <Link
            data-game-mode-shock-target
            href={`/play/singleplayer?difficulty=${difficulty}&gameMode=${gameMode}`}
            className="rgb-hover-button card-action-height inline-flex w-full min-w-0 items-center justify-center rounded-full bg-white px-4 text-[0.95rem] font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-6 sm:text-base"
          >
            <span className="relative z-10">{t("setup.play")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
