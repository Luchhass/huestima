"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GAME_MODE_IDS, ROUND_COUNT } from "@/lib/constants";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { useGameChrome } from "@/hooks/useGameChrome";
import { useTranslation } from "@/hooks/useLanguage";
import { MUSIC_SCENES, useMusicScene } from "@/hooks/useMusicScene";
import { GAME_PHASES } from "@/hooks/useSingleplayerGame";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { trackMatchEnd, trackMatchStart } from "@/lib/analytics";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import WaitingCard from "./WaitingCard";
import LeaderboardCard from "./LeaderboardCard";

const FLAG_WIDGET_EXIT_DELAY_MS = 680;

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
  gamePayload,
  room,
  leaderboard,
  onBackHome,
  onBackLobby,
  isReturningLobby,
  error = "",
}) {
  const { t } = useTranslation();
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const game = useMultiplayerGame({
    roomCode,
    playerId,
    difficultyId,
    gameModeId,
    gamePayload,
    room,
    incomingLeaderboard: leaderboard,
  });
  const { phase, leaderboard: gameLeaderboard, showLeaderboard } = game;
  const currentRoundLabel = game.isDuelMode
    ? `R${game.roundIndex + 1}/${game.roundCount}`
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
  const isFlagMode = game.gameMode.id === GAME_MODE_IDS.FLAG;
  const isCartoonMode = game.gameMode.id === GAME_MODE_IDS.CARTOON;
  const cartoonPreloadTargets = useMemo(() => {
    if (!isCartoonMode) return [];
    if (game.targetColors.length) return game.targetColors;
    return game.targetColor ? [game.targetColor] : [];
  }, [game.targetColor, game.targetColors, isCartoonMode]);
  const [renderedPhase, setRenderedPhase] = useState(game.phase);
  const [isShowcaseWidgetExiting, setIsShowcaseWidgetExiting] = useState(false);
  const usesShowcaseGuessChrome = isFlagMode || isCartoonMode;
  const isRenderedShowcaseGuessPhase =
    usesShowcaseGuessChrome && renderedPhase === GAME_PHASES.GUESS;

  useGameChrome(isImmersivePhase);
  useCartoonAssetPreload(isCartoonMode, cartoonPreloadTargets);
  useFlagFullscreenLock(isFlagMode || isCartoonMode);
  useMusicScene(
    renderedPhase === GAME_PHASES.INTRO ? "silent" : MUSIC_SCENES.GAME,
  );

  useEffect(() => {
    if (game.phase === renderedPhase) return undefined;

    if (renderedPhase === GAME_PHASES.GUESS && usesShowcaseGuessChrome) {
      const exitStartId = window.setTimeout(() => {
        setIsShowcaseWidgetExiting(true);
      }, 0);

      const timeoutId = window.setTimeout(() => {
        setRenderedPhase(game.phase);
        setIsShowcaseWidgetExiting(false);
      }, FLAG_WIDGET_EXIT_DELAY_MS);

      return () => {
        window.clearTimeout(exitStartId);
        window.clearTimeout(timeoutId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      setRenderedPhase(game.phase);
      setIsShowcaseWidgetExiting(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [game.phase, renderedPhase, usesShowcaseGuessChrome]);

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
      renderedPhase === GAME_PHASES.GUESS);

  return (
    <main
      className="game-stage app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8"
      style={
        isRenderedShowcaseGuessPhase
          ? { "--flag-control-count": game.difficulty?.controls?.length || 3 }
          : undefined
      }
    >
      <GameCardShell
        color={shellColor}
        className={`${isRenderedShowcaseGuessPhase ? "flag-game-card-shell" : ""} ${
          isShowcaseWidgetExiting ? "flag-game-card-shell--exiting" : ""
        }`}
        flagOverlayProps={
          isFlagMode && isRenderedShowcaseGuessPhase
            ? {
                isInteractive: true,
                activeSlotId: game.guessColor.activeSlotId,
                onSlotSelect: (slotId) => {
                  const selectedSlot = game.guessColor.slots?.find(
                    (slotColor) => slotColor.id === slotId,
                  );

                  game.updateGuess({
                    ...game.guessColor,
                    activeSlotId: slotId,
                    h: selectedSlot?.h ?? game.guessColor.h,
                    s: selectedSlot?.s ?? game.guessColor.s,
                    v: selectedSlot?.v ?? game.guessColor.v,
                  });
                },
              }
            : undefined
        }
        cartoonOverlayProps={
          isCartoonMode
            ? {
                variant:
                  renderedPhase === GAME_PHASES.GUESS ? "guess" : "reference",
              }
            : undefined
        }
        heightMode={usesCompactShowcaseCard ? "compact" : "normal"}
        isExpanded={renderedPhase === "leaderboard"}
      >
        <div className="h-full min-h-[inherit]">
          {renderedPhase === GAME_PHASES.INTRO && (
            <IntroPhase
              key={`intro-${game.roundIndex}`}
              onComplete={game.finishIntro}
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
              />
            ) : (
              <MemorizePhase
                key={`memorize-${game.roundIndex}`}
                round={game.roundIndex + 1}
                roundLabel={currentRoundLabel}
                durationMs={game.revealDurationMs || undefined}
                onComplete={game.finishMemorize}
                progressItems={progressItems}
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
              progressItems={progressItems}
              isShowcaseWidgetExiting={isShowcaseWidgetExiting}
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
              onBackHome={onBackHome}
              onBackLobby={onBackLobby}
              isReturningLobby={isReturningLobby}
              error={error}
            />
          )}

          {game.error && renderedPhase !== "waiting" && (
            <p className="absolute bottom-4 left-6 right-6 z-30 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-semibold text-red-200">
              {game.error}
            </p>
          )}
        </div>
      </GameCardShell>
    </main>
  );
}
