"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useTranslation } from "@/hooks/useLanguage";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import { colorToneHex, gradientBackground, readableTone } from "@/lib/color";
import { formatScore } from "@/lib/scoring";

const MULTIPLAYER_MAX_ROUND_SCORE = 10;
const EXPANDED_REVEAL_DELAY = 320;

function formatTotal(score) {
  return formatScore(score);
}

function formatRoundScore(score) {
  return formatScore(score);
}

function tileGradient(result) {
  return gradientBackground(result.guess);
}

function colorTitleLabel(color) {
  if (color?.left && color?.right) {
    return `${color.left.hex} / ${color.right.hex}`;
  }

  return color?.hex || "";
}

function getScoreColor(score, maxScore) {
  const ratio = Math.max(0, Math.min(score / maxScore, 1));
  const hue = Math.round(ratio * 120);

  return `hsl(${hue} 100% 58%)`;
}

function tileScoreTone(hex) {
  return readableTone(hex) === "dark" ? "text-zinc-950" : "text-white";
}

export default function LeaderboardCard({
  leaderboard,
  currentPlayerId,
  onBackHome,
  onBackLobby,
  isReturningLobby = false,
  error = "",
}) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);
  const [lastAction, setLastAction] = useState(null);
  const [hiddenActionError, setHiddenActionError] = useState("");

  useAppChromeHidden(true);
  useScreenReveal(scopeRef, [leaderboard?.completedAt], {
    delay: EXPANDED_REVEAL_DELAY,
  });

  const rows = leaderboard?.leaderboard || [];
  const winner = rows[0];
  const totalRounds = leaderboard?.totalRounds || 5;
  const maxTotalScore =
    leaderboard?.maxTotalScore || totalRounds * MULTIPLAYER_MAX_ROUND_SCORE;
  const activeActionError = error && error !== hiddenActionError ? error : "";
  const homeActionError = activeActionError && lastAction === "home";
  const lobbyActionError = activeActionError && (lastAction === "lobby" || !lastAction);

  useEffect(() => {
    if (!activeActionError) return undefined;

    const timeoutId = window.setTimeout(() => {
      setHiddenActionError(activeActionError);
      setLastAction(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [activeActionError]);

  const handleBackHome = () => {
    setHiddenActionError("");
    setLastAction("home");
    onBackHome?.();
  };

  const handleBackLobby = () => {
    if (isReturningLobby) return;

    setHiddenActionError("");
    setLastAction("lobby");
    onBackLobby?.();
  };

  return (
    <div ref={scopeRef} className="leaderboard-card relative flex h-full flex-col overflow-hidden bg-black p-6 text-white sm:p-8">
      <button
        type="button"
        onClick={handleBackHome}
        aria-label={t("common.backHome")}
        className="solo-close-button absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8 sm:top-8 sm:size-9"
      >
        <X className="size-6 sm:size-6.5" strokeWidth={1.7} />
      </button>

      {winner && (
        <div data-screen-reveal className="max-w-100 pr-10">
          <h1 className="text-[clamp(3rem,11vw,4.35rem)] font-semibold leading-[0.95] tracking-normal text-white">
            {winner.playerName}
          </h1>

          <p className="mt-4 max-w-[24rem] text-[0.95rem] font-medium leading-[1.22] text-white/84 sm:text-base">
            {t("room.takesRoom")}
          </p>
        </div>
      )}

      <div className="scrollbar-hidden mt-7 min-h-0 flex-1 space-y-5 overflow-y-auto pr-0.5">
        {rows.map((row) => {
          const isLocal = row.playerId === currentPlayerId;
          const scoreColor = getScoreColor(row.totalScore, maxTotalScore);
          const roundResults = row.roundResults || [];

          return (
            <article key={row.playerId} data-screen-reveal className="shrink-0">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 text-sm font-semibold leading-none text-white/42">
                    #{row.rank}
                  </span>

                  <p className="truncate text-[0.95rem] font-semibold leading-none text-white sm:text-base">
                    {row.playerName}
                    {isLocal && (
                      <span className="ml-2 text-[0.68rem] font-bold tracking-widest text-white/42 uppercase">
                        {t("room.you")}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-end gap-1.5">
                  <p
                    className="text-[1.45rem] font-semibold leading-[0.82] tracking-normal sm:text-[1.65rem]"
                    style={{ color: scoreColor }}
                  >
                    {formatTotal(row.totalScore)}
                  </p>

                  <p className="pb-px text-sm font-semibold leading-none text-white/35">
                    / {maxTotalScore}
                  </p>
                </div>
              </div>

              <div className="grid h-18 grid-cols-5 overflow-hidden sm:h-19.5">
                {roundResults.map((result) => (
                  <div
                    key={`${row.playerId}-${result.round}`}
                    className="relative overflow-hidden"
                    style={{ background: gradientBackground(result.target) }}
                    title={t("room.roundTitle", {
                      round: result.round,
                      target: colorTitleLabel(result.target),
                      guess: colorTitleLabel(result.guess),
                    })}
                  >
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: tileGradient(result),
                        clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                      }}
                    />

                    <span
                      className={`absolute left-2 top-2 z-10 text-[0.9rem] font-semibold leading-none sm:text-[0.95rem] ${tileScoreTone(
                        colorToneHex(result.target),
                      )}`}
                    >
                      {formatRoundScore(result.score)}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div data-screen-reveal className="mt-4 w-full">
        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleBackHome}
            className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full border-2 px-3 text-center text-[0.78rem] font-semibold leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-5 sm:text-base ${
              homeActionError
                ? "border-red-500 bg-red-500 text-white"
                : "border-white/95 bg-transparent text-white hover:bg-white/10"
            }`}
          >
            {homeActionError && (
              <X className="shrink-0" size={16} strokeWidth={2.35} />
            )}
            <span className="min-w-0 truncate">
              {homeActionError || t("common.backHome")}
            </span>
          </button>

          <button
            type="button"
            onClick={handleBackLobby}
            disabled={isReturningLobby}
            className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-[0.78rem] font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-base ${
              lobbyActionError
                ? "bg-red-500 text-white shadow-[0_16px_30px_rgba(239,68,68,0.22)]"
                : "rgb-hover-button bg-white text-zinc-950"
            }`}
          >
            {lobbyActionError && (
              <X className="relative z-10 shrink-0" size={16} strokeWidth={2.35} />
            )}
            <span className="relative z-10 min-w-0 truncate">
              {lobbyActionError ||
                (isReturningLobby ? t("room.returningLobby") : t("room.backLobby"))}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
