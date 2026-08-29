"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GAME_MODE_IDS, ROUND_COUNT } from "@/lib/constants";
import {
  isCartoonFamily,
  isLogoFamily,
  isFlagFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { useGameChrome } from "@/hooks/useGameChrome";
import { useTranslation } from "@/hooks/useLanguage";
import { MUSIC_SCENES, useMusicScene } from "@/hooks/useMusicScene";
import { GAME_PHASES } from "@/hooks/useSingleplayerGame";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { trackMatchEnd, trackMatchStart } from "@/lib/analytics";
import { upsertMatchHistoryEntry } from "@/lib/matchHistory";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import WaitingCard from "./WaitingCard";
import LeaderboardCard from "./LeaderboardCard";

const FLAG_WIDGET_EXIT_DELAY_MS = 680;
const SHOWCASE_RESULT_CENTER_DELAY_MS = 560;
const SHOWCASE_RESULT_EXPAND_DELAY_MS = 560;
const SHOWCASE_RESULT_REVEAL_DELAY_MS =
  SHOWCASE_RESULT_CENTER_DELAY_MS + SHOWCASE_RESULT_EXPAND_DELAY_MS;
const CARD_RESIZE_DURATION_MS = 700;
const LEADERBOARD_HOME_FADE_DURATION_MS = 240;

function buildProgressItems(room, currentPlayerId) {
  const isDuelMode = room?.gameMode === GAME_MODE_IDS.DUEL;
  const totalRounds = room?.game?.roundCount || ROUND_COUNT;
  const currentDuelRound = (room?.game?.currentRoundIndex ?? 0) + 1;

  return (room?.players || [])
    .filter((player) => !isDuelMode || !player.eliminated)
    .map((player, index) => {
      const progress = player.progress || {};
      const completedRounds = progress.completedRounds ?? player.completedRounds ?? 0;
      const currentRound =
        progress.currentRound ??
        player.currentRound ??
        (isDuelMode ? currentDuelRound : Math.min(completedRounds + 1, totalRounds));
      const roundsTotal =
        progress.totalRounds || player.totalRounds || (isDuelMode ? null : totalRounds);

      return {
        id: player.id,
        name: player.name,
        joinedAt: player.joinedAt || index,
        isCurrent: player.id === currentPlayerId,
        completedRounds,
        currentRound: isDuelMode
          ? Math.max(0, currentRound)
          : Math.max(0, Math.min(currentRound, roundsTotal)),
        totalRounds: roundsTotal,
        label: isDuelMode
          ? `R${Math.max(1, currentRound)}`
          : `${Math.max(0, Math.min(currentRound, roundsTotal))}/${roundsTotal}`,
      };
    })
    .sort((first, second) => {
      if (second.currentRound !== first.currentRound) {
        return second.currentRound - first.currentRound;
      }

      if (second.completedRounds !== first.completedRounds) {
        return second.completedRounds - first.completedRounds;
      }

      return first.joinedAt - second.joinedAt;
    });
}

export default function MultiplayerGame({
  roomCode,
  playerId,
  difficultyId,
  gameModeId,
  gameFamily = "color",
  gamePayload,
  room,
  leaderboard,
  onBackHome,
  onBackLobby,
  isReturningLobby,
  error = "",
}) {
  const cleanGameFamily = normalizeGameFamily(gameFamily);
  const { t } = useTranslation();
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const game = useMultiplayerGame({
    roomCode,
    playerId,
    difficultyId,
    gameModeId,
    gameFamily: cleanGameFamily,
    flagDifficulty: room?.flagDifficulty,
    gamePayload,
    room,
    incomingLeaderboard: leaderboard,
  });
  const { abandonSession } = game;
  const { phase, leaderboard: gameLeaderboard, showLeaderboard } = game;
  const currentRoundLabel = game.isDuelMode
    ? `R${game.roundIndex + 1}/${game.roundCount}`
    : game.isEndlessMode || game.isSprintMode
      ? `${game.roundIndex + 1}/${game.roundIndex + 1}`
      : `${game.roundIndex + 1}/${game.roundCount}`;
  const progressItems = useMemo(
    () => buildProgressItems(room, playerId),
    [playerId, room],
  );
  const isImmersivePhase =
    phase === GAME_PHASES.INTRO ||
    phase === GAME_PHASES.MEMORIZE ||
    phase === GAME_PHASES.GUESS ||
    phase === GAME_PHASES.RESULT ||
    phase === "waiting";
  const isFlagMode = isFlagFamily(cleanGameFamily);
  const isCartoonMode = isCartoonFamily(cleanGameFamily);
  const isBrandMode = isLogoFamily(cleanGameFamily);
  const visualPreloadTargets = useMemo(() => {
    if (!isFlagMode && !isCartoonMode && !isBrandMode) return [];
    if (game.targetColors.length) return game.targetColors;
    return game.targetColor ? [game.targetColor] : [];
  }, [game.targetColor, game.targetColors, isBrandMode, isCartoonMode, isFlagMode]);
  const [renderedPhase, setRenderedPhase] = useState(null);
  const [isShowcaseWidgetExiting, setIsShowcaseWidgetExiting] = useState(false);
  const [isShowcaseWidgetEntering, setIsShowcaseWidgetEntering] = useState(false);
  const [isShowcaseResultExpanded, setIsShowcaseResultExpanded] = useState(false);
  const [isLeavingLeaderboardHome, setIsLeavingLeaderboardHome] = useState(false);
  const [isLeavingLeaderboardLobby, setIsLeavingLeaderboardLobby] = useState(false);
  const [resumePhase, setResumePhase] = useState(null);
  const isPageUnloadRef = useRef(false);
  const historySavedRef = useRef(false);
  const usesShowcaseGuessChrome =
    game.isSprintMode && (isFlagMode || isCartoonMode);
  const usesShowcaseTransition =
    cleanGameFamily !== "color" && !game.isSprintMode;
  const usesExternalGuessChrome =
    (isFlagMode || isCartoonMode) && renderedPhase === GAME_PHASES.GUESS;
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
      gameType: "multiplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      rounds: game.roundCount,
    });
  }, [game.difficulty.id, game.gameMode.id, game.roundCount]);

  useEffect(() => {
    if (phase === "waiting" && gameLeaderboard) {
      showLeaderboard();
    }
  }, [gameLeaderboard, phase, showLeaderboard]);

  useEffect(() => {
    if (
      completionTrackedRef.current ||
      phase !== "leaderboard" ||
      !game.leaderboard
    ) {
      return;
    }

    const rows = game.leaderboard.leaderboard || [];
    const currentRow = rows.find((row) => row.playerId === playerId);
    const totalRounds = game.leaderboard.totalRounds || game.roundCount || ROUND_COUNT;
    const totalScore = currentRow?.totalScore || 0;

    completionTrackedRef.current = true;
    trackMatchEnd({
      gameType: "multiplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      totalScore,
      averageScore: totalRounds ? totalScore / totalRounds : 0,
      rounds: totalRounds,
    });
  }, [
    game.difficulty.id,
    game.gameMode.id,
    game.leaderboard,
    game.roundCount,
    phase,
    playerId,
  ]);

  useEffect(() => {
    if (phase !== "leaderboard" || !game.leaderboard || historySavedRef.current) {
      return;
    }

    historySavedRef.current = true;
    const rows = game.leaderboard.leaderboard || [];
    const currentRow = rows.find((row) => row.playerId === playerId);

    upsertMatchHistoryEntry({
      id: game.historyMatchId,
      gameType: "multiplayer",
      gameFamily: cleanGameFamily,
      gameMode: game.gameMode.id,
      difficulty: game.difficulty.id,
      rounds: game.leaderboard.totalRounds || game.roundCount,
      roundCount: game.roundCount,
      isEndlessMode: game.isEndlessMode || game.isDuelMode,
      totalScore: currentRow?.totalScore || 0,
      averageScore:
        game.leaderboard.totalRounds
          ? (currentRow?.totalScore || 0) / game.leaderboard.totalRounds
          : 0,
      playerCount: rows.length,
      roomCode,
      leaderboard: game.leaderboard,
    });
  }, [
    cleanGameFamily,
    game.difficulty.id,
    game.gameMode.id,
    game.historyMatchId,
    game.isDuelMode,
    game.isEndlessMode,
    game.leaderboard,
    game.roundCount,
    phase,
    playerId,
    roomCode,
  ]);

  const handleBackHome = async () => {
    if (isLeavingLeaderboardHome || isLeavingLeaderboardLobby) return;

    setIsLeavingLeaderboardHome(true);
    game.abandonSession();

    await new Promise((resolve) => {
      window.setTimeout(resolve, LEADERBOARD_HOME_FADE_DURATION_MS);
    });

    setIsShowcaseResultExpanded(false);

    await new Promise((resolve) => {
      window.setTimeout(resolve, CARD_RESIZE_DURATION_MS);
    });

    await onBackHome?.();
  };

  const handleBackLobby = async () => {
    if (isLeavingLeaderboardHome || isLeavingLeaderboardLobby) return;

    setIsLeavingLeaderboardLobby(true);
    game.abandonSession();

    await new Promise((resolve) => {
      window.setTimeout(resolve, LEADERBOARD_HOME_FADE_DURATION_MS);
    });

    setIsShowcaseResultExpanded(false);

    await new Promise((resolve) => {
      window.setTimeout(resolve, CARD_RESIZE_DURATION_MS);
    });

    await onBackLobby?.();
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
    (isFlagMode || isCartoonMode) &&
    (renderedPhase === GAME_PHASES.MEMORIZE ||
      renderedPhase === GAME_PHASES.GUESS ||
      (renderedPhase === GAME_PHASES.RESULT && !isShowcaseResultExpanded));

  if (!game.hasRestoredSession || renderedPhase === null) {
    return (
      <main className="game-stage app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
        <GameCardShell
          color={{ h: 0, s: 0, v: 0, hex: "#000000" }}
          data-intro-card-target
        >
          <div className="h-full min-h-[inherit]" data-route-transition-scope />
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
        backgroundOverride={isLogoFamily(cleanGameFamily) ? "#000000" : null}
        hideVisualLabel={game.isSprintMode || game.guessDurationMs > 0}
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
          isLogoFamily(cleanGameFamily)
            ? {
                base: (game.difficulty?.controls?.length || 1) * 50 + 24,
                sm: (game.difficulty?.controls?.length || 1) * 50 + 32,
              }
            : null
        }
        heightMode={usesCompactShowcaseCard ? "compact" : "normal"}
        isExpanded={
          renderedPhase === "leaderboard" &&
          !isLeavingLeaderboardHome &&
          !isLeavingLeaderboardLobby
        }
      >
        <div className="h-full min-h-[inherit]" data-route-transition-scope>
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
                durationMs={game.revealDurationMs || undefined}
                roundCount={game.roundCount}
                onColorChange={game.setTargetColor}
                onComplete={game.finishMemorize}
                progressItems={progressItems}
                resumeElapsedMs={resumeElapsedMs}
              />
            ) : (
              <MemorizePhase
                key={`memorize-${game.roundIndex}`}
                round={game.roundIndex + 1}
                roundLabel={currentRoundLabel}
                durationMs={game.revealDurationMs || undefined}
                onComplete={game.finishMemorize}
                progressItems={progressItems}
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
              progressItems={progressItems}
              showcaseLayoutEnabled={usesShowcaseGuessChrome}
              resumeElapsedMs={resumeElapsedMs}
              resumeInstantly={resumePhase === GAME_PHASES.GUESS}
              isShowcaseWidgetEntering={isShowcaseWidgetEntering}
              isShowcaseWidgetExiting={isShowcaseWidgetExiting}
              hintCount={game.hintCount}
              unlimitedHints={game.unlimitedHints}
              hintActive={game.hintActive}
              hintsEnabled={game.hintsEnabled}
              onUseHint={game.useHint}
            />
          )}

          {renderedPhase === GAME_PHASES.RESULT && (
            <ResultPhase
              key={`result-${game.roundIndex}`}
              result={game.latestResult}
              roundLabel={currentRoundLabel}
              hasNextRound={
                game.isDuelMode
                  ? !game.leaderboard && !game.isCurrentPlayerEliminated
                  : game.roundIndex + 1 < game.roundCount
              }
              onContinue={game.continueFromResult}
              visualIntroDelayMs={
                cleanGameFamily !== "color" && isRenderedShowcaseResultPhase
                  ? SHOWCASE_RESULT_REVEAL_DELAY_MS
                  : 0
              }
              resumeInstantly={resumePhase === GAME_PHASES.RESULT}
            />
          )}

          {renderedPhase === "waiting" && (
            <WaitingCard
              message={
                game.error ||
                (game.isCurrentPlayerEliminated
                  ? t("room.eliminatedWaiting")
                  : t("room.automaticResults"))
              }
            />
          )}

          {renderedPhase === "leaderboard" && (
            <LeaderboardCard
              leaderboard={game.leaderboard}
              currentPlayerId={playerId}
              onBackHome={handleBackHome}
              onBackLobby={handleBackLobby}
              isReturningLobby={isReturningLobby}
              isLeavingHome={isLeavingLeaderboardHome || isLeavingLeaderboardLobby}
              error={error}
            />
          )}

          {game.error && renderedPhase !== "waiting" && (
            <p className="absolute bottom-4 left-6 right-6 z-30 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-semibold text-red-200">
              {game.error}
            </p>
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
