"use client";

import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { readableTone } from "@/lib/color";
import { formatScore } from "@/lib/scoring";

const MULTIPLAYER_MAX_ROUND_SCORE = 10;

function formatTotal(score) {
  return formatScore(score);
}

function formatRoundScore(score) {
  return formatScore(score);
}

function tileGradient(result) {
  return `linear-gradient(135deg, ${result.target.hex} 0 50%, ${result.guess.hex} 50% 100%)`;
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
  const rows = leaderboard?.leaderboard || [];
  const winner = rows[0];
  const totalRounds = leaderboard?.totalRounds || 5;
  const maxTotalScore =
    leaderboard?.maxTotalScore || totalRounds * MULTIPLAYER_MAX_ROUND_SCORE;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black p-6 text-white sm:p-8">
      <button
        type="button"
        onClick={onBackHome}
        aria-label={t("common.backHome")}
        className="solo-close-button absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8 sm:top-8 sm:size-9"
      >
        <X className="size-6 sm:size-6.5" strokeWidth={1.7} />
      </button>

      {winner && (
        <div className="max-w-100 pr-10">
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
            <article key={row.playerId} className="shrink-0">
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
                    className="relative"
                    style={{ background: tileGradient(result) }}
                    title={t("room.roundTitle", {
                      round: result.round,
                      target: result.target.hex,
                      guess: result.guess.hex,
                    })}
                  >
                    <span
                      className={`absolute left-2 top-2 text-[0.9rem] font-semibold leading-none sm:text-[0.95rem] ${tileScoreTone(
                        result.target.hex,
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

      <div className="mt-4 grid w-full grid-cols-2 gap-3 max-[460px]:grid-cols-1">
        <button
          type="button"
          onClick={onBackHome}
          className="card-action-height inline-flex min-w-0 items-center justify-center rounded-full border-2 border-white/95 bg-transparent px-5 text-center text-sm font-semibold leading-tight text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-base"
        >
          <span className="min-w-0 truncate">{t("common.backHome")}</span>
        </button>

        <button
          type="button"
          onClick={onBackLobby}
          disabled={isReturningLobby}
          className="rgb-hover-button card-action-height inline-flex min-w-0 items-center justify-center rounded-full bg-white px-5 text-center text-sm font-semibold leading-tight text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:text-base"
        >
          <span className="relative z-10 min-w-0 truncate">
            {isReturningLobby ? t("room.returningLobby") : t("room.backLobby")}
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-2 text-center text-xs font-semibold text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
