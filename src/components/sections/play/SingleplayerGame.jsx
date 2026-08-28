"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GAME_MODE_IDS } from "@/lib/constants";
import {
  getGameFamilyHref,
  isCartoonFamily,
  isBrandFamily,
  isFlagFamily,
  isTeamFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useGameChrome } from "@/hooks/useGameChrome";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { MUSIC_SCENES, useMusicScene } from "@/hooks/useMusicScene";
import { GAME_PHASES, useSingleplayerGame } from "@/hooks/useSingleplayerGame";
import { trackMatchEnd, trackMatchStart } from "@/lib/analytics";
import { upsertMatchHistoryEntry } from "@/lib/matchHistory";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import FinalSummary from "@/components/ui/game/FinalSummary";
import { LEAVE_ACTIVE_GAME_EVENT } from "@/lib/gameNavigation";

const FLAG_WIDGET_EXIT_DELAY_MS = 680;
const SHOWCASE_RESULT_CENTER_DELAY_MS = 560;
const SHOWCASE_RESULT_EXPAND_DELAY_MS = 560;
const SHOWCASE_RESULT_REVEAL_DELAY_MS =
  SHOWCASE_RESULT_CENTER_DELAY_MS + SHOWCASE_RESULT_EXPAND_DELAY_MS;
const CARD_RESIZE_DURATION_MS = 700;
const FINAL_HOME_FADE_DURATION_MS = 240;

export default function SingleplayerGame({
  initialDifficulty,
  initialGameMode,
  initialRoundCount,
  initialHintsEnabled = true,
  initialFlagDifficulty = null,
  initialFlagDifficulties = null,
  initialCartoonIds = null,
  initialTeamIds = null,
  gameFamily = "color",
}) {
  const router = useRouter();
  const cleanGameFamily = normalizeGameFamily(gameFamily);
  const game = useSingleplayerGame(
    initialDifficulty,
    initialGameMode,
    initialRoundCount,
    initialHintsEnabled,
    cleanGameFamily,
    initialFlagDifficulties || initialFlagDifficulty,
    initialCartoonIds,
    initialTeamIds,
  );
  const { abandonSession } = game;
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const latestResult = game.results[game.results.length - 1];
  const isImmersivePhase = game.phase !== GAME_PHASES.FINAL;
  const currentRoundLabel = game.isEndlessMode || game.isSprintMode
    ? `${game.roundIndex + 1}/${game.roundIndex + 1}`
    : `${game.roundIndex + 1}/${game.roundCount}`;
  const latestResultRoundLabel =
    latestResult
      ? game.isEndlessMode || game.isSprintMode
        ? `${latestResult.round}/${latestResult.round}`
        : `${latestResult.round}/${game.roundCount}`
      : undefined;
  const isFlagMode = isFlagFamily(cleanGameFamily);
  const isCartoonMode = isCartoonFamily(cleanGameFamily);
  const isBrandMode = isBrandFamily(cleanGameFamily);
  const isTeamMode = isTeamFamily(cleanGameFamily);
  const visualPreloadTargets = useMemo(() => {
    if (!isFlagMode && !isCartoonMode && !isBrandMode && !isTeamMode) return [];
    if (game.targetColors.length) return game.targetColors;
    return game.targetColor ? [game.targetColor] : [];
  }, [game.targetColor, game.targetColors, isBrandMode, isCartoonMode, isFlagMode, isTeamMode]);
  const homeHref = getGameFamilyHref(cleanGameFamily);
  const [renderedPhase, setRenderedPhase] = useState(null);
  const [isShowcaseWidgetExiting, setIsShowcaseWidgetExiting] = useState(false);
  const [isShowcaseWidgetEntering, setIsShowcaseWidgetEntering] = useState(false);
  const [isShowcaseResultExpanded, setIsShowcaseResultExpanded] = useState(false);
  const [isLeavingFinalHome, setIsLeavingFinalHome] = useState(false);
  const [resumePhase, setResumePhase] = useState(null);
  const isPageUnloadRef = useRef(false);
  const historySavedRef = useRef(false);
  const usesShowcaseGuessChrome =
    (game.isSprintMode && (isFlagMode || isCartoonMode || isBrandMode || isTeamMode)) ||
    (isFlagMode && game.gameMode.id === GAME_MODE_IDS.FLAG_RECALL) ||
    (isCartoonMode && game.gameMode.id === GAME_MODE_IDS.CARTOON) ||
    (isBrandMode && game.gameMode.id === GAME_MODE_IDS.BRAND_RECALL) ||
    (isTeamMode && game.gameMode.id === GAME_MODE_IDS.TEAM_RECALL);
  const usesShowcaseTransition = true;
  const usesExternalGuessChrome =
    (isFlagMode || isCartoonMode || isBrandMode || isTeamMode) && renderedPhase === GAME_PHASES.GUESS;
  const isRenderedShowcaseGuessPhase =
    usesShowcaseGuessChrome && renderedPhase === GAME_PHASES.GUESS;
  const isRenderedShowcaseResultPhase = renderedPhase === GAME_PHASES.RESULT;
  const isResultToIntroTransition =
    renderedPhase === GAME_PHASES.RESULT && game.phase === GAME_PHASES.INTRO;
  const initialResumeElapsedMs =
    game.restoredFromSession &&
    Number.isFinite(game.resumeSavedAt) &&
    Number.isFinite(game.phaseStartedAt)
      ? Math.max(0, game.resumeSavedAt - game.phaseStartedAt)
      : 0;

  const resumeElapsedMs =
    resumePhase && resumePhase === renderedPhase
      ? initialResumeElapsedMs
      : 0;

  useGameChrome(isImmersivePhase);
  useCartoonAssetPreload(isFlagMode || isCartoonMode || isBrandMode, visualPreloadTargets);
  useFlagFullscreenLock(isFlagMode || isCartoonMode || isBrandMode);
  useMusicScene(
    renderedPhase === null || renderedPhase === GAME_PHASES.INTRO
      ? "silent"
      : MUSIC_SCENES.GAME,
  );

  useEffect(() => {
    if (!game.hasRestoredSession) return undefined;
    if (renderedPhase !== null) return undefined;

    const timeoutId = window.setTimeout(() => {
      setRenderedPhase(game.phase);
      if (game.restoredFromSession) {
        setResumePhase(game.phase);
        if (
          game.phase === GAME_PHASES.RESULT &&
          initialResumeElapsedMs >= SHOWCASE_RESULT_CENTER_DELAY_MS
        ) {
          setIsShowcaseResultExpanded(true);
        }
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    game.hasRestoredSession,
    game.phase,
    game.restoredFromSession,
    initialResumeElapsedMs,
    renderedPhase,
  ]);

  useEffect(() => {
    if (!resumePhase || renderedPhase !== resumePhase) return undefined;

    const timeoutId = window.setTimeout(() => {
      setResumePhase(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [renderedPhase, resumePhase]);

  useEffect(() => {
    const markUnload = () => {
      isPageUnloadRef.current = true;
    };

    window.addEventListener("pagehide", markUnload);
    window.addEventListener("beforeunload", markUnload);

    return () => {
      window.removeEventListener("pagehide", markUnload);
      window.removeEventListener("beforeunload", markUnload);
    };
  }, []);

  useEffect(() => {
    return function cleanupAbandonedSession() {
      if (!isPageUnloadRef.current) {
        abandonSession();
      }
    };
  }, [abandonSession]);

  useEffect(() => {
    const handleLeaveActiveGame = () => abandonSession();
    window.addEventListener(LEAVE_ACTIVE_GAME_EVENT, handleLeaveActiveGame);

    return () => {
      window.removeEventListener(LEAVE_ACTIVE_GAME_EVENT, handleLeaveActiveGame);
    };
  }, [abandonSession]);

  useEffect(() => {
    if (renderedPhase === null) return undefined;
    if (game.phase === renderedPhase) return undefined;

    const sprintExpired = game.isSprintMode && game.sprintRemainingMs <= 0;

    if (
      renderedPhase === GAME_PHASES.GUESS &&
      usesShowcaseTransition &&
      !sprintExpired
    ) {
      const exitStartId = window.setTimeout(() => {
        setIsShowcaseWidgetExiting(true);
        setIsShowcaseResultExpanded(false);
      }, 0);

      const phaseTimeoutId = window.setTimeout(() => {
        setRenderedPhase(game.phase);
        setIsShowcaseWidgetExiting(false);
      }, FLAG_WIDGET_EXIT_DELAY_MS);

      return () => {
        window.clearTimeout(exitStartId);
        window.clearTimeout(phaseTimeoutId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      setRenderedPhase(game.phase);
      setIsShowcaseWidgetExiting(false);
      setIsShowcaseResultExpanded(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    game.isSprintMode,
    game.phase,
    game.sprintRemainingMs,
    renderedPhase,
    usesShowcaseTransition,
  ]);

  useEffect(() => {
    let resetId = null;
    if (!usesExternalGuessChrome) {
      resetId = window.setTimeout(() => {
        setIsShowcaseWidgetEntering(false);
      }, 0);
      return () => window.clearTimeout(resetId);
    }

    resetId = window.setTimeout(() => {
      setIsShowcaseWidgetEntering(false);
    }, 0);
    const revealId = window.setTimeout(() => {
      setIsShowcaseWidgetEntering(true);
    }, 560);

    return () => {
      window.clearTimeout(resetId);
      window.clearTimeout(revealId);
    };
  }, [usesExternalGuessChrome]);

  useEffect(() => {
    if (!isRenderedShowcaseResultPhase) return undefined;

    const expandTimeoutId = window.setTimeout(() => {
      setIsShowcaseResultExpanded(true);
    }, SHOWCASE_RESULT_CENTER_DELAY_MS);

    return () => window.clearTimeout(expandTimeoutId);
  }, [isRenderedShowcaseResultPhase]);

  useEffect(() => {
    if (startTrackedRef.current) return;

    startTrackedRef.current = true;
    trackMatchStart({
      gameType: "singleplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      rounds: game.roundCount,
    });
  }, [game.difficulty.id, game.gameMode.id, game.roundCount]);

  useEffect(() => {
    if (game.phase !== GAME_PHASES.FINAL || completionTrackedRef.current) return;

    completionTrackedRef.current = true;
    trackMatchEnd({
      gameType: "singleplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      totalScore: game.summary.totalScore,
      averageScore: game.summary.averageScore,
      rounds: game.results.length,
    });
  }, [
    game.difficulty.id,
    game.gameMode.id,
    game.phase,
    game.results.length,
    game.summary.averageScore,
    game.summary.totalScore,
  ]);

  useEffect(() => {
    if (game.phase !== GAME_PHASES.FINAL || historySavedRef.current) return;

    historySavedRef.current = true;
    upsertMatchHistoryEntry({
      id: game.historyMatchId,
      gameType: "singleplayer",
      gameFamily: cleanGameFamily,
      gameMode: game.gameMode.id,
      difficulty: game.difficulty.id,
      rounds: game.results.length,
      roundCount: game.roundCount,
      isEndlessMode: game.isEndlessMode,
      totalScore: game.summary.totalScore,
      averageScore: game.summary.averageScore,
      maxScore: game.summary.maxScore,
      results: game.results,
    });
  }, [
    cleanGameFamily,
    game.difficulty.id,
    game.gameMode.id,
    game.historyMatchId,
    game.isEndlessMode,
    game.phase,
    game.results,
    game.roundCount,
    game.summary.averageScore,
    game.summary.maxScore,
    game.summary.totalScore,
  ]);

  const handlePlayAgain = () => {
    startTrackedRef.current = true;
    completionTrackedRef.current = false;
    historySavedRef.current = false;
    trackMatchStart({
      gameType: "singleplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      rounds: game.roundCount,
    });
    game.playAgain();
  };

  const handleBackHome = async () => {
    if (isLeavingFinalHome) return;

    setIsLeavingFinalHome(true);
    game.abandonSession();

    await new Promise((resolve) => {
      window.setTimeout(resolve, FINAL_HOME_FADE_DURATION_MS);
    });

    setIsShowcaseResultExpanded(false);

    await new Promise((resolve) => {
      window.setTimeout(resolve, CARD_RESIZE_DURATION_MS);
    });

    router.push(homeHref);
  };
  const shellColor =
    renderedPhase === GAME_PHASES.INTRO
      ? "#000000"
      : renderedPhase === GAME_PHASES.MEMORIZE
        ? game.targetColor
        : renderedPhase === GAME_PHASES.GUESS
          ? game.guessColor
          : null;
  const usesCompactShowcaseCard =
    (isFlagMode || isCartoonMode || isBrandMode) &&
    (renderedPhase === GAME_PHASES.MEMORIZE ||
      renderedPhase === GAME_PHASES.GUESS ||
      (renderedPhase === GAME_PHASES.RESULT && !isShowcaseResultExpanded));

  if (!game.hasRestoredSession || renderedPhase === null) {
    return (
      <main className="game-stage app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
        <GameCardShell color={{ h: 0, s: 0, v: 0, hex: "#000000" }}>
          <div className="h-full min-h-[inherit]" />
        </GameCardShell>
      </main>
    );
  }

  return (
    <main
      className="game-stage app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8"
      style={
        usesExternalGuessChrome
          ? { "--flag-control-count": game.difficulty?.controls?.length || 3 }
          : undefined
      }
    >
      <GameCardShell
        data-intro-card-target
        color={shellColor}
        overlayToneSource={
          isRenderedShowcaseGuessPhase ? game.targetColor || game.guessColor : null
        }
        className={`${usesExternalGuessChrome ? "flag-game-card-shell" : ""} ${
          isRenderedShowcaseResultPhase ? "showcase-result-card-shell" : ""
        } ${
          isShowcaseWidgetExiting ? "flag-game-card-shell--exiting" : ""
        }`}
        cartoonOverlayProps={
          isCartoonMode
            ? {
                variant:
                  renderedPhase === GAME_PHASES.GUESS ? "guess" : "reference",
                highlightPulse: renderedPhase === GAME_PHASES.GUESS,
                pulseKey: game.roundIndex,
              }
            : undefined
        }
        brandLabelOffset={
          isBrandMode && renderedPhase === GAME_PHASES.GUESS
            ? {
                base: (game.difficulty?.controls?.length || 1) * 50 + 24,
                sm: (game.difficulty?.controls?.length || 1) * 50 + 32,
              }
            : null
        }
        heightMode={usesCompactShowcaseCard ? "compact" : "normal"}
        isExpanded={renderedPhase === GAME_PHASES.FINAL && !isLeavingFinalHome}
      >
        <div data-route-transition-scope className="h-full min-h-[inherit]">
          {renderedPhase === GAME_PHASES.INTRO && (
            <IntroPhase
              key={`intro-${game.roundIndex}`}
              onComplete={game.finishIntro}
              resumeElapsedMs={resumeElapsedMs}
              resumeInstantly={resumePhase === GAME_PHASES.INTRO}
            />
          )}

          {renderedPhase === GAME_PHASES.MEMORIZE && game.targetColor && (
            game.isSequenceMode ? (
              <SequenceMemorizePhase
                key="sequence-memorize"
                colors={game.targetColors}
                durationMs={game.revealDurationMs}
                roundCount={game.roundCount}
                onColorChange={game.setTargetColor}
                onComplete={game.finishMemorize}
                resumeElapsedMs={resumeElapsedMs}
              />
            ) : (
              <MemorizePhase
                key={`memorize-${game.roundIndex}`}
                round={game.roundIndex + 1}
                roundLabel={currentRoundLabel}
                durationMs={game.revealDurationMs}
                onComplete={game.finishMemorize}
                resumeElapsedMs={resumeElapsedMs}
                resumeInstantly={resumePhase === GAME_PHASES.MEMORIZE}
              />
            )
          )}

          {renderedPhase === GAME_PHASES.GUESS && (
            <GuessPhase
              key={`guess-${game.roundIndex}`}
              round={game.roundIndex + 1}
              roundLabel={currentRoundLabel}
              difficulty={game.difficulty}
              targetColor={game.targetColor}
              guessColor={game.guessColor}
              onGuessChange={game.updateGuess}
              onSubmit={game.submitGuess}
              guessDurationMs={game.guessDurationMs}
              sprintDurationMs={game.sprintDurationMs}
              sprintRemainingMs={game.sprintRemainingMs}
              showcaseLayoutEnabled={usesShowcaseGuessChrome}
              resumeElapsedMs={resumeElapsedMs}
              resumeInstantly={resumePhase === GAME_PHASES.GUESS}
              isShowcaseWidgetEntering={isShowcaseWidgetEntering}
              isShowcaseWidgetExiting={isShowcaseWidgetExiting}
              isExiting={isShowcaseWidgetExiting}
              hintCount={game.hintCount}
              hintActive={game.hintActive}
              hintsEnabled={game.hintsEnabled}
              onUseHint={game.useHint}
            />
          )}

          {renderedPhase === GAME_PHASES.RESULT && (
            <ResultPhase
              key={`result-${game.roundIndex}`}
              result={latestResult}
              roundLabel={latestResultRoundLabel}
              hasNextRound={game.isEndlessMode || game.roundIndex + 1 < game.roundCount}
              canFinishRun={game.isEndlessMode}
              onFinishRun={game.finishRun}
              onContinue={game.continueFromResult}
              visualIntroDelayMs={
                isRenderedShowcaseResultPhase
                  ? SHOWCASE_RESULT_REVEAL_DELAY_MS
                  : 0
              }
              resumeInstantly={resumePhase === GAME_PHASES.RESULT}
            />
          )}

          {renderedPhase === GAME_PHASES.FINAL && (
            <FinalSummary
              results={game.results}
              totalScore={game.summary.totalScore}
              averageScore={game.summary.averageScore}
              maxScore={game.summary.maxScore}
              onPlayAgain={handlePlayAgain}
              onBackHome={handleBackHome}
              isLeavingHome={isLeavingFinalHome}
            />
          )}

          {isResultToIntroTransition && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-70 rounded-[inherit] bg-black"
            />
          )}
        </div>
      </GameCardShell>
    </main>
  );
}
