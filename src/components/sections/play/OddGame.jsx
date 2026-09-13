"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameCardShell from "@/components/ui/game/GameCardShell";
import FinalSummary from "@/components/ui/game/FinalSummary";
import GuessPhase from "@/components/ui/game/GuessPhase";
import IntroPhase from "@/components/ui/game/IntroPhase";
import OddBoard from "@/components/ui/game/OddBoard";
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
import { createOddPuzzle, isOddSelectionCorrect } from "../../../../shared/oddGame.mjs";

const PHASES = { INTRO: "intro", PLAY: "play", FINAL: "final" };
const ODD_DIFFICULTY = { controls: [] };

export default function OddGame({ difficulty = "normal" }) {
  const router = useRouter();
  const { t } = useTranslation();
  const phaseRef = useRef(PHASES.INTRO);
  const phaseStartedAtRef = useRef(Date.now());
  const snapshotRef = useRef(null);
  const isPageUnloadRef = useRef(false);
  const submittingRef = useRef(false);
  const transitionOverlayRef = useRef(null);
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const historySavedRef = useRef(false);
  const [phase, setPhaseState] = useState(PHASES.INTRO);
  const [level, setLevel] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [results, setResults] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [resumePhase, setResumePhase] = useState(null);
  const [resumeElapsedMs, setResumeElapsedMs] = useState(0);
  const [historyMatchId, setHistoryMatchId] = useState(() => createMatchHistoryId());
  const [isLeavingFinalHome, setIsLeavingFinalHome] = useState(false);
  const gameSessionKey = buildGameSessionKey("perception-odd", [difficulty]);

  const setPhase = (nextPhase) => {
    phaseRef.current = nextPhase;
    phaseStartedAtRef.current = Date.now();
    setPhaseState(nextPhase);
  };

  const createRound = (nextLevel) => {
    setPuzzle(createOddPuzzle(Math.random, { difficulty, level: nextLevel }));
    setSelectedIndex(null);
    setRoundResult(null);
    submittingRef.current = false;
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const restored = getGameSession(gameSessionKey);
      if (restored?.puzzle) {
        setLevel(Math.max(0, Number(restored.level) || 0));
        setPuzzle(restored.puzzle);
        setSelectedIndex(null);
        setResults(Array.isArray(restored.results) ? restored.results : []);
        setHistoryMatchId(restored.historyMatchId || createMatchHistoryId());
        const restoredPhase = restored.phase === "result"
          ? restored.roundResult?.oddPassed ? PHASES.PLAY : PHASES.FINAL
          : restored.phase || PHASES.INTRO;
        if (restored.phase === "result" && restored.roundResult?.oddPassed) {
          const nextLevel = Math.max(0, Number(restored.level) || 0) + 1;
          setLevel(nextLevel);
          setPuzzle(createOddPuzzle(Math.random, { difficulty, level: nextLevel }));
        }
        phaseRef.current = restoredPhase;
        phaseStartedAtRef.current = restored.phaseStartedAt || Date.now();
        setResumePhase(restoredPhase);
        setResumeElapsedMs(Math.max(0, (Number(restored.savedAt) || Date.now()) - phaseStartedAtRef.current));
        setPhaseState(restoredPhase);
        return;
      }
      createRound(0);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [difficulty, gameSessionKey]);

  useEffect(() => {
    snapshotRef.current = {
      phase,
      phaseStartedAt: phaseStartedAtRef.current,
      level,
      puzzle,
      selectedIndex,
      results,
      roundResult,
      historyMatchId,
    };
  }, [historyMatchId, level, phase, puzzle, results, roundResult, selectedIndex]);

  useEffect(() => {
    if (!puzzle || !snapshotRef.current) return;
    saveGameSession(gameSessionKey, snapshotRef.current);
  }, [gameSessionKey, historyMatchId, level, phase, puzzle, results, roundResult, selectedIndex]);

  useEffect(() => {
    const persist = () => snapshotRef.current && saveGameSession(gameSessionKey, snapshotRef.current);
    const markUnload = () => { isPageUnloadRef.current = true; persist(); };
    window.addEventListener("pagehide", markUnload);
    window.addEventListener("beforeunload", markUnload);
    return () => {
      window.removeEventListener("pagehide", markUnload);
      window.removeEventListener("beforeunload", markUnload);
    };
  }, [gameSessionKey]);

  useEffect(() => () => {
    if (!isPageUnloadRef.current) clearGameSession(gameSessionKey);
  }, [gameSessionKey]);

  const runBlackTransition = async (onCovered) => {
    const overlay = transitionOverlayRef.current;
    if (!overlay) {
      onCovered();
      return;
    }
    overlay.style.pointerEvents = "auto";
    const fadeIn = overlay.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 90, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    await fadeIn.finished.catch(() => {});
    onCovered();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const fadeOut = overlay.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 130, easing: "cubic-bezier(0, 0, 0.2, 1)", fill: "forwards" },
    );
    await fadeOut.finished.catch(() => {});
    overlay.style.pointerEvents = "none";
    submittingRef.current = false;
  };

  const chooseTile = async (index) => {
    if (phaseRef.current !== PHASES.PLAY || submittingRef.current || !puzzle) return;
    submittingRef.current = true;
    const oddPassed = isOddSelectionCorrect(puzzle, index);
    const result = {
      round: level + 1,
      roundIndex: level,
      target: { hex: puzzle.oddColor },
      targetColor: puzzle,
      guess: { oddSelection: index, hex: puzzle.colors[index] },
      oddSelection: index,
      oddPassed,
      score: 0,
      grade: oddPassed ? "Perfect" : "Missed",
    };
    setResults((current) => [...current, result]);
    await runBlackTransition(() => {
      if (!oddPassed) {
        clearGameSession(gameSessionKey);
        setPhase(PHASES.FINAL);
        return;
      }
      const nextLevel = level + 1;
      setLevel(nextLevel);
      createRound(nextLevel);
      setPhase(PHASES.PLAY);
    });
  };

  const playAgain = () => {
    clearGameSession(gameSessionKey);
    setLevel(0);
    setResults([]);
    completionTrackedRef.current = false;
    historySavedRef.current = false;
    setHistoryMatchId(createMatchHistoryId());
    createRound(0);
    setPhase(PHASES.INTRO);
    setResumePhase(null);
    setResumeElapsedMs(0);
    trackMatchStart({ gameType: "singleplayer", difficulty, gameMode: "odd" });
  };

  const correctCount = results.filter((result) => result.oddPassed).length;
  const roundLabel = `${level + 1}/${level + 1}`;

  useMusicScene(phase === PHASES.INTRO ? "silent" : MUSIC_SCENES.GAME);

  useEffect(() => {
    if (!puzzle || startTrackedRef.current) return;
    startTrackedRef.current = true;
    trackMatchStart({ gameType: "singleplayer", difficulty, gameMode: "odd" });
  }, [difficulty, puzzle]);

  useEffect(() => {
    if (phase !== PHASES.FINAL || completionTrackedRef.current) return;
    completionTrackedRef.current = true;
    trackMatchEnd({ gameType: "singleplayer", difficulty, gameMode: "odd", totalScore: 0, averageScore: 0, rounds: correctCount, progressValue: correctCount, progressUnit: "levels" });
  }, [correctCount, difficulty, phase]);

  useEffect(() => {
    if (phase !== PHASES.FINAL || historySavedRef.current) return;
    historySavedRef.current = true;
    upsertMatchHistoryEntry({ id: historyMatchId, gameType: "singleplayer", gameFamily: "perception", gameMode: "odd", difficulty, rounds: correctCount, roundCount: correctCount, isEndlessMode: true, totalScore: 0, averageScore: 0, maxScore: 0, progressValue: correctCount, progressUnit: "levels", results });
  }, [correctCount, difficulty, historyMatchId, phase, results]);

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
      <GameCardShell data-intro-card-target backgroundOverride="#000" isExpanded={phase === PHASES.FINAL && !isLeavingFinalHome}>
        <div data-route-transition-scope className="relative h-full min-h-[inherit] bg-black text-white">
          {phase === PHASES.INTRO && <IntroPhase key={level} onComplete={() => setPhase(PHASES.PLAY)} ready={Boolean(puzzle)} resumeElapsedMs={resumePhase === PHASES.INTRO ? resumeElapsedMs : 0} resumeInstantly={resumePhase === PHASES.INTRO} />}
          {phase === PHASES.PLAY && puzzle && (
            <GuessPhase
              key={`odd-guess-${level}`}
              round={level + 1}
              roundLabel={roundLabel}
              difficulty={ODD_DIFFICULTY}
              guessColor={null}
              onGuessChange={() => {}}
              onSubmit={() => {}}
              showcaseLayoutEnabled={false}
              hideSubmitButton
              customContentAnimated={false}
              customContentReceivesPointerEvents
              customContent={<OddBoard puzzle={puzzle} interactive onTile={chooseTile} />}
            />
          )}
          {phase === PHASES.FINAL && (
            <FinalSummary
              results={results}
              totalScore={correctCount}
              averageScore={correctCount ? 10 : 0}
              maxScore={Math.max(1, correctCount)}
              onPlayAgain={playAgain}
              onBackHome={handleBackHome}
              isLeavingHome={isLeavingFinalHome}
              summaryUnit={t("game.odd.levels")}
              assessmentOverride={t("game.odd.finalCopy", { level: correctCount })}
              hideTileScores
              suppressScoreAudio
            />
          )}
          <div ref={transitionOverlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[80] bg-black opacity-0" />
        </div>
      </GameCardShell>
    </main>
  );
}
