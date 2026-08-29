"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useTranslation } from "@/hooks/useLanguage";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import {
  colorToneHex,
  getVisualLabel,
  gradientBackground,
  isCartoonColor,
  isBrandColor,
  isFlagColor,
  readableTone,
} from "@/lib/color";
import { formatScore } from "@/lib/scoring";
import CartoonOverlay from "@/components/ui/game/CartoonOverlay";
import FlagOverlay from "@/components/ui/game/FlagOverlay";
import BrandOverlay from "@/components/ui/game/BrandOverlay";
import { pushNotification } from "@/components/ui/GlobalPushNotifications";

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

function colorTitleLabel(color, locale) {
  if (color?.left && color?.right) {
    return `${color.left.hex} / ${color.right.hex}`;
  }

  if (isFlagColor(color)) {
    return `${getVisualLabel(color, locale)} ${color.hex}`.trim();
  }

  if (isCartoonColor(color) || isBrandColor(color)) {
    return `${getVisualLabel(color, locale)} ${color.hex}`.trim();
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
  isLeavingHome = false,
  error = "",
}) {
  const { locale, t } = useTranslation();
  const scopeRef = useRef(null);
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

  useEffect(() => {
    if (!activeActionError) return undefined;

    pushNotification(activeActionError, "error");

    const timeoutId = window.setTimeout(() => {
      setHiddenActionError(activeActionError);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [activeActionError]);

  const handleBackHome = () => {
    if (isLeavingHome) return;

    setHiddenActionError("");
    onBackHome?.();
  };

  const handleBackLobby = () => {
    if (isReturningLobby) return;

    setHiddenActionError("");
    onBackLobby?.();
  };

  return (
    <div
      ref={scopeRef}
      className={`leaderboard-card relative flex h-full flex-col overflow-hidden bg-black p-6 text-white transition-opacity duration-200 sm:p-8 ${
        isLeavingHome ? "opacity-0" : "opacity-100"
      }`}
    >
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
          const hasFlagResults = roundResults.some((result) => isFlagColor(result.target));

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

              <div
                className={`grid grid-cols-5 overflow-hidden ${
                  hasFlagResults ? "" : "h-18 sm:h-19.5"
                }`}
              >
                {roundResults.map((result, resultIndex) => (
                  <div
                    key={`${row.playerId}-${result.round}-${resultIndex}-${result.target?.flagId || result.target?.hex || result.target?.toneHex || "round"}`}
                    className={`relative overflow-hidden ${
                      "aspect-square"
                    }`}
                    style={{ background: gradientBackground(result.target) }}
                    title={t("room.roundTitle", {
                      round: result.round,
                      target: colorTitleLabel(result.target, locale),
                      guess: colorTitleLabel(result.guess, locale),
                    })}
                  >
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: tileGradient(result),
                        clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                      }}
                    />

                    {isFlagColor(result.target) && (
                      <FlagOverlay color={result.target} className="z-[1]" />
                    )}

                    {isCartoonColor(result.target) && (
                      <CartoonOverlay
                        color={result.target}
                        variant="tile"
                        size="tile"
                        className="z-[2]"
                      />
                    )}

                    {isBrandColor(result.target) && (
                      <BrandOverlay color={result.target} className="z-[2]" size="tile" />
                    )}

                    <span
                      className={`absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] truncate text-[clamp(0.92rem,2.8vw,1.05rem)] font-semibold leading-none tabular-nums sm:text-[1.08rem] ${tileScoreTone(
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
            className="app-secondary-action card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full border-2 border-white/95 bg-transparent px-3 text-center text-[0.78rem] font-semibold leading-tight text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-5 sm:text-base"
          >
            <span className="min-w-0 truncate">
              {t("common.backHome")}
            </span>
          </button>

          <button
            type="button"
            onClick={handleBackLobby}
            disabled={isReturningLobby}
            className="rgb-hover-button card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-white px-3 text-center text-[0.78rem] font-semibold leading-tight text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-base"
          >
            <span className="relative z-10 min-w-0 truncate">
              {isReturningLobby ? t("room.returningLobby") : t("room.backLobby")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
