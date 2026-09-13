"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameCardShell from "@/components/ui/game/GameCardShell";
import FinalSummary from "@/components/ui/game/FinalSummary";
import GuessPhase from "@/components/ui/game/GuessPhase";
import IntroPhase from "@/components/ui/game/IntroPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import PatternBoard from "@/components/ui/game/PatternBoard";
import { useTranslation } from "@/hooks/useLanguage";
import { MUSIC_SCENES, useMusicScene } from "@/hooks/useMusicScene";
import { trackMatchEnd, trackMatchStart } from "@/lib/analytics";
import { createMatchHistoryId, upsertMatchHistoryEntry } from "@/lib/matchHistory";
import { CARD_RESIZE_DURATION_MS } from "@/hooks/useFooterPageTransition";
import {
  buildGameSessionKey,
  clearGameSession,
  getGameSession,
  saveGameSession,
} from "@/hooks/useGameSession";
import {
  createPatternPuzzle,
  getPatternDurationMs,
  countMisplacedPatternTiles,
  isPatternSolved,
  scorePatternRound,
  swapPatternTiles,
} from "../../../../shared/patternGame.mjs";

const PHASES = { INTRO: "intro", PLAY: "play", RESULT: "result", FINAL: "final" };
const PATTERN_DIFFICULTY = { controls: [] };
const PATTERN_BLACK = { h: 0, s: 0, v: 0, hex: "#000000" };

export default function PatternGame({ difficulty = "easy", roundCount = 5 }) {
  const router = useRouter();
  const { t } = useTranslation();
  const cardRef = useRef(null);
  const phaseRef = useRef(PHASES.INTRO);
  const phaseStartedAtRef = useRef(Date.now());
  const snapshotRef = useRef(null);
  const isPageUnloadRef = useRef(false);
  const boardRef = useRef([]);
  const swapsRef = useRef(0);
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const historySavedRef = useRef(false);
  const [phase, setPhaseState] = useState(PHASES.INTRO);
  const [roundIndex, setRoundIndex] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [board, setBoardState] = useState([]);
  const [selected, setSelected] = useState(null);
  const [swaps, setSwapsState] = useState(0);
  const [results, setResults] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [resumeElapsedMs, setResumeElapsedMs] = useState(0);
  const [resumePhase, setResumePhase] = useState(null);
  const [historyMatchId, setHistoryMatchId] = useState(() => createMatchHistoryId());
  const [isLeavingFinalHome, setIsLeavingFinalHome] = useState(false);
  const gameSessionKey = buildGameSessionKey("perception-pattern", [difficulty, roundCount]);

  const setPhase = (nextPhase) => {
    phaseRef.current = nextPhase;
    phaseStartedAtRef.current = Date.now();
    setPhaseState(nextPhase);
  };
  const setBoard = (nextBoard) => {
    boardRef.current = nextBoard;
    setBoardState(nextBoard);
  };
  const setSwaps = (nextSwaps) => {
    swapsRef.current = nextSwaps;
    setSwapsState(nextSwaps);
  };
  const createRound = () => {
    const nextPuzzle = createPatternPuzzle(Math.random, { difficulty });
    setPuzzle(nextPuzzle);
    setBoard(nextPuzzle.board);
    setSelected(null);
    setSwaps(0);
    setRoundResult(null);
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const restoredSession = getGameSession(gameSessionKey);
      if (restoredSession?.puzzle && Array.isArray(restoredSession.board)) {
        setPuzzle(restoredSession.puzzle);
        setBoard(restoredSession.board);
        setRoundIndex(restoredSession.roundIndex || 0);
        setSelected(restoredSession.selected ?? null);
        setSwaps(restoredSession.swaps || 0);
        setResults(Array.isArray(restoredSession.results) ? restoredSession.results : []);
        setRoundResult(restoredSession.roundResult || null);
        setHistoryMatchId(restoredSession.historyMatchId || createMatchHistoryId());
        phaseStartedAtRef.current = restoredSession.phaseStartedAt || Date.now();
        phaseRef.current = restoredSession.phase || PHASES.INTRO;
        setPhaseState(restoredSession.phase || PHASES.INTRO);
        setResumePhase(restoredSession.phase || PHASES.INTRO);
        setResumeElapsedMs(Math.max(
          0,
          (Number(restoredSession.savedAt) || Date.now()) - phaseStartedAtRef.current,
        ));
        return;
      }

      const initialPuzzle = createPatternPuzzle(Math.random, { difficulty });
      setPuzzle(initialPuzzle);
      boardRef.current = initialPuzzle.board;
      setBoardState(initialPuzzle.board);
      swapsRef.current = 0;
      setSwapsState(0);
      phaseStartedAtRef.current = Date.now();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [difficulty, gameSessionKey]);

  useEffect(() => {
    snapshotRef.current = {
      phase: phaseRef.current,
      phaseStartedAt: phaseStartedAtRef.current,
      roundIndex,
      puzzle,
      board,
      selected,
      swaps,
      results,
      roundResult,
      historyMatchId,
    };
  }, [board, historyMatchId, phase, puzzle, roundIndex, roundResult, results, selected, swaps]);

  useEffect(() => {
    if (!puzzle || !snapshotRef.current) return;
    saveGameSession(gameSessionKey, snapshotRef.current);
  }, [board, gameSessionKey, historyMatchId, phase, puzzle, results, roundIndex, roundResult, selected, swaps]);

  useEffect(() => {
    const persistLatestSnapshot = () => {
      if (snapshotRef.current) saveGameSession(gameSessionKey, snapshotRef.current);
    };
    window.addEventListener("pagehide", persistLatestSnapshot);
    window.addEventListener("beforeunload", persistLatestSnapshot);
    return () => {
      window.removeEventListener("pagehide", persistLatestSnapshot);
      window.removeEventListener("beforeunload", persistLatestSnapshot);
    };
  }, [gameSessionKey]);

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

  useEffect(() => () => {
    if (!isPageUnloadRef.current) clearGameSession(gameSessionKey);
  }, [gameSessionKey]);

  const finishRound = ({ remainingMs = 0 } = {}) => {
    if (phaseRef.current !== PHASES.PLAY) return;
    const solved = isPatternSolved(boardRef.current);
    const result = {
      round: roundIndex + 1,
      roundIndex,
      target: { hex: puzzle.colors[Math.floor(puzzle.colors.length / 2)] },
      guess: {
        hex: puzzle.colors[
          boardRef.current.find((tile, position) => tile !== position) ??
          Math.floor(puzzle.colors.length / 2)
        ],
      },
      solved,
      swaps: swapsRef.current,
      score: scorePatternRound({
        initialMisplaced: puzzle.misplacedPositions.length,
        remainingMisplaced: countMisplacedPatternTiles(boardRef.current),
      }),
    };
    setRoundResult(result);
    setResults((current) => [...current, result]);
    setSelected(null);
    setPhase(PHASES.RESULT);
  };

  const handleTile = (position) => {
    if (phaseRef.current !== PHASES.PLAY) return;
    if (selected === null) return setSelected(position);
    if (selected === position) return setSelected(null);
    setBoard(swapPatternTiles(boardRef.current, selected, position));
    setSwaps(swapsRef.current + 1);
    setSelected(null);
  };

  const continueGame = () => {
    if (roundIndex + 1 >= roundCount) return setPhase(PHASES.FINAL);
    setRoundIndex((current) => current + 1);
    createRound();
    setPhase(PHASES.INTRO);
  };
  const playAgain = () => {
    clearGameSession(gameSessionKey);
    completionTrackedRef.current = false;
    historySavedRef.current = false;
    setHistoryMatchId(createMatchHistoryId());
    setRoundIndex(0);
    setResults([]);
    createRound();
    setPhase(PHASES.INTRO);
    setResumePhase(null);
    setResumeElapsedMs(0);
    trackMatchStart({ gameType: "singleplayer", difficulty, gameMode: "pattern" });
  };

  const totalScore = results.reduce((total, result) => total + result.score, 0);
  const roundLabel = `${roundIndex + 1}/${roundCount}`;

  useMusicScene(phase === PHASES.INTRO ? "silent" : MUSIC_SCENES.GAME);

  useEffect(() => {
    if (!puzzle || startTrackedRef.current) return;
    startTrackedRef.current = true;
    trackMatchStart({ gameType: "singleplayer", difficulty, gameMode: "pattern" });
  }, [difficulty, puzzle]);

  useEffect(() => {
    if (phase !== PHASES.FINAL || completionTrackedRef.current) return;
    completionTrackedRef.current = true;
    trackMatchEnd({ gameType: "singleplayer", difficulty, gameMode: "pattern", totalScore, averageScore: results.length ? totalScore / results.length : 0, rounds: results.length });
  }, [difficulty, phase, results.length, totalScore]);

  useEffect(() => {
    if (phase !== PHASES.FINAL || historySavedRef.current) return;
    historySavedRef.current = true;
    upsertMatchHistoryEntry({ id: historyMatchId, gameType: "singleplayer", gameFamily: "perception", gameMode: "pattern", difficulty, rounds: results.length, roundCount, totalScore, averageScore: results.length ? totalScore / results.length : 0, maxScore: Math.max(10, results.length * 10), results });
  }, [difficulty, historyMatchId, phase, results, roundCount, totalScore]);

  const handleBackHome = async () => {
    if (isLeavingFinalHome) return;
    setIsLeavingFinalHome(true);
    clearGameSession(gameSessionKey);
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    await new Promise((resolve) => window.setTimeout(resolve, CARD_RESIZE_DURATION_MS));
    router.push("/perception");
  };

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <GameCardShell ref={cardRef} data-intro-card-target backgroundOverride="#000" isExpanded={phase === PHASES.FINAL && !isLeavingFinalHome}>
        <div data-route-transition-scope className="relative h-full min-h-[inherit] bg-black text-white">
          {phase === PHASES.INTRO && <IntroPhase key={roundIndex} onComplete={() => setPhase(PHASES.PLAY)} ready={Boolean(puzzle)} resumeElapsedMs={resumePhase === PHASES.INTRO ? resumeElapsedMs : 0} resumeInstantly={resumePhase === PHASES.INTRO} />}
          {phase === PHASES.PLAY && puzzle && (
            <GuessPhase
              key={`pattern-guess-${roundIndex}`}
              round={roundIndex + 1}
              roundLabel={roundLabel}
              difficulty={PATTERN_DIFFICULTY}
              guessColor={PATTERN_BLACK}
              onGuessChange={() => {}}
              onSubmit={finishRound}
              guessDurationMs={getPatternDurationMs(difficulty)}
              resumeElapsedMs={resumePhase === PHASES.PLAY ? Math.min(getPatternDurationMs(difficulty), resumeElapsedMs) : 0}
              showcaseLayoutEnabled={false}
              submitLabel={t("game.pattern.submit")}
              customContentAnimated={false}
              customContentReceivesPointerEvents
              timedTimerDisplay="clock"
              hideSubmitButton
              customContent={<PatternBoard puzzle={puzzle} board={board} selected={selected} interactive onTile={handleTile} />}
            />
          )}
          {phase === PHASES.RESULT && puzzle && roundResult && (
            <ResultPhase
              result={roundResult}
              roundLabel={roundLabel}
              hasNextRound={roundIndex + 1 < roundCount}
              onContinue={continueGame}
              customContent={<PatternBoard puzzle={puzzle} board={board} showMisplacedHint />}
              customResultLine={roundResult.solved ? t("game.pattern.solved") : t("game.pattern.timeout")}
              customSelectionLabel={t("game.pattern.swaps", { count: swaps })}
              resumeInstantly={resumePhase === PHASES.RESULT}
            />
          )}
          {phase === PHASES.FINAL && (
            <FinalSummary
              results={results}
              totalScore={totalScore}
              averageScore={results.length ? totalScore / results.length : 0}
              maxScore={Math.max(10, results.length * 10)}
              onPlayAgain={playAgain}
              onBackHome={handleBackHome}
              isLeavingHome={isLeavingFinalHome}
            />
          )}
        </div>
      </GameCardShell>
    </main>
  );
}
