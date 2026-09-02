"use client";

import { Images } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DifficultySwitch from "@/components/ui/DifficultySwitch";
import GameModePicker from "@/components/ui/GameModePicker";
import LevelCountPicker from "@/components/ui/LevelCountPicker";
import { useGameModeShock } from "@/hooks/useGameModeShock";
import { playScreenFadeOut } from "@/hooks/useScreenReveal";
import { useTranslation } from "@/hooks/useLanguage";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  DEFAULT_ROUND_COUNT,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import { getAvailableGameModeOptions, getGameModeOption } from "@/lib/gameMode";
import { serializeHintsEnabled } from "@/lib/hints";
import { GAME_FAMILY_IDS } from "@/lib/gameFamily";

const SINGLEPLAYER_GAME_MODE_OPTIONS = getAvailableGameModeOptions(
  GAME_MODE_OPTIONS.filter((option) => !option.multiplayerOnly),
);

export default function SingleplayerCard({
  difficulty,
  gameMode,
  gameFamily = GAME_FAMILY_IDS.COLOR,
  gameModeOptions = SINGLEPLAYER_GAME_MODE_OPTIONS,
  playPath = "/color/singleplayer",
  roundCount = DEFAULT_ROUND_COUNT,
  hintsEnabled = true,
  onDifficultyChange,
  onDifficultyFeedback,
  onGameModeChange,
  onRoundCountChange,
  onRoundCountFeedback,
  flagDifficulty = "starter",
  onFlagDifficultyChange,
  flagDifficulties = [],
  cartoonIds = [],
  onCartoonIdsChange,
  onOpenCartoonPool,
  onOpenFlagPool,
  teamIds = [],
  onOpenTeamPool,
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const scopeRef = useRef(null);
  const isNavigatingRef = useRef(false);
  const gameModeOption = getGameModeOption(gameMode, gameModeOptions);
  const difficultyLocked = Boolean(gameModeOption?.lockedDifficultyId);
  const roundCountLocked = Boolean(gameModeOption?.isEndless || gameModeOption?.isSprint);
  const selectedMode = gameMode || DEFAULT_GAME_MODE_ID;
  const selectedDifficulty = difficulty || DEFAULT_DIFFICULTY_ID;
  const isVisualFamily = gameFamily !== GAME_FAMILY_IDS.COLOR;
  const visualModeKeys = ["normal", "endless", "timed", "sprint"];
  const mechanicsKey = isVisualFamily && visualModeKeys.includes(selectedMode)
    ? `visual${selectedMode[0].toUpperCase()}${selectedMode.slice(1)}`
    : selectedMode;
  const difficultyKey = selectedMode === "gradient" ? "gradient" : selectedDifficulty;
  const runKey = selectedMode === "endless"
    ? "endless"
    : selectedMode === "sprint"
      ? "sprint"
      : selectedMode === "timed"
        ? "timed"
        : "fixed";
  const roundUnit = roundCount === 1
    ? t("setup.roundUnit.single")
    : t("setup.roundUnit.plural");
  const overviewCopy = `${t(`setup.familyObjective.${gameFamily}`)} ${t(`setup.modeMechanics.${mechanicsKey}`)}`;
  const rulesCopy = `${t(`setup.difficultyDetail.${difficultyKey}`)} ${t(`setup.runDetail.${runKey}`, {
    roundCount,
    roundUnit,
  })}`;

  useGameModeShock(scopeRef, gameMode);

  const handlePlay = async (event) => {
    if (isNavigatingRef.current) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    isNavigatingRef.current = true;

    await playScreenFadeOut(scopeRef, { duration: 0.28 });
    const cartoonQuery = cartoonIds.length ? `&cartoons=${encodeURIComponent(cartoonIds.join(","))}` : "";
    const flagQuery = flagDifficulties.length ? `&flagDifficulties=${encodeURIComponent(flagDifficulties.join(","))}` : `&flagDifficulty=${flagDifficulty}`;
    const teamQuery = teamIds.length ? `&teams=${encodeURIComponent(teamIds.join(","))}` : "";
    router.push(`${playPath}?difficulty=${difficulty}&gameMode=${gameMode}&roundCount=${roundCount}&hints=${serializeHintsEnabled(hintsEnabled)}${flagQuery}${cartoonQuery}${teamQuery}`);
  };

  return (
    <div ref={scopeRef} className="home-view-panel flex h-full flex-col">
      <div
        data-screen-reveal
        className="home-view-copy w-[min(35rem,calc(100%-3.75rem))] sm:w-[min(35rem,calc(100%-5.5rem))]"
      >
        <h1
          data-game-mode-shock-target
          className="text-[clamp(2.3rem,9.2vw,3.2rem)] font-semibold lowercase leading-[0.9] tracking-normal text-white sm:text-[4.05rem]"
        >
          {t("setup.singleplayer")}
        </h1>

        <div className="mt-3.5 max-w-[35.5rem] space-y-2.5 sm:mt-4 sm:max-w-[36.75rem] sm:space-y-3">
          <p
            data-game-mode-shock-target
            className="text-[0.9rem] font-medium leading-[1.28] text-white/84 sm:text-[0.96rem]"
          >
            {overviewCopy}
          </p>
          <p
            data-game-mode-shock-target
            className="text-[0.9rem] font-medium leading-[1.28] text-white/68 sm:text-[0.96rem]"
          >
            {rulesCopy}
          </p>
        </div>

      </div>

      <div data-screen-reveal className="home-view-actions mt-auto w-full">
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:gap-3">
          <div
            data-game-mode-shock-target
            className="min-w-0"
          >
            <DifficultySwitch
              value={difficulty}
              onChange={onDifficultyChange}
              onSelectFeedback={onDifficultyFeedback}
              disabled={difficultyLocked}
            />
          </div>

          <div
            data-game-mode-shock-target
            className="min-w-0"
          >
            <LevelCountPicker
              value={roundCount}
              onChange={onRoundCountChange}
              onImpact={onRoundCountFeedback}
              isEndless={roundCountLocked}
              disabled={roundCountLocked}
            />
          </div>
        </div>
      </div>

      <div data-screen-reveal className="home-view-actions mt-3 w-full">
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:gap-3">
          <div
            data-game-mode-shock-target
            data-game-mode-shock-weight="strong"
            className="min-w-0"
          >
            <GameModePicker
              value={gameMode}
              onChange={onGameModeChange}
              options={gameModeOptions}
              disabled={gameModeOptions.length < 2}
            />
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {(gameFamily === GAME_FAMILY_IDS.CARTOON || gameFamily === GAME_FAMILY_IDS.FLAG || gameFamily === GAME_FAMILY_IDS.TEAM) && (
              <div data-game-mode-shock-target className="shrink-0">
                <button type="button" onClick={gameFamily === GAME_FAMILY_IDS.CARTOON ? onOpenCartoonPool : gameFamily === GAME_FAMILY_IDS.FLAG ? onOpenFlagPool : onOpenTeamPool} aria-label={t("common.choosePools")} title={t("common.choosePools")} className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white p-3 text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                  <Images className="relative z-10 size-5" strokeWidth={2} />
                </button>
              </div>
            )}

            <div
              data-game-mode-shock-target
              data-game-mode-shock-weight="strong"
              className="min-w-0 flex-1"
            >
              <Link
                href={`${playPath}?difficulty=${difficulty}&gameMode=${gameMode}&roundCount=${roundCount}&hints=${serializeHintsEnabled(hintsEnabled)}`}
                onClick={handlePlay}
                className="rgb-hover-button card-action-height inline-flex w-full min-w-0 items-center justify-center rounded-full bg-white px-4 text-[0.95rem] font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-6 sm:text-base"
              >
                <span className="relative z-10">{t("setup.play")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
