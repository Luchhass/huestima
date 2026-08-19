"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Share2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { playScreenFadeOut, useScreenReveal } from "@/hooks/useScreenReveal";
import { useTranslation } from "@/hooks/useLanguage";
import {
  buildSharedMatchUrl,
  buildReplayMatchUrl,
  getMatchHistoryEntry,
  readMatchHistory,
  removeMatchHistoryEntry,
} from "@/lib/matchHistory";
import { normalizeGameFamily } from "@/lib/gameFamily";
import { formatScore } from "@/lib/scoring";
import {
  colorToneHex,
  getVisualLabel,
  gradientBackground,
  isCartoonColor,
  isFlagColor,
  readableTone,
} from "@/lib/color";
import CartoonOverlay from "@/components/ui/game/CartoonOverlay";
import FlagOverlay from "@/components/ui/game/FlagOverlay";

const CARD_RESIZE_DURATION_MS = 700;
const CONTENT_FADE_DURATION_MS = 240;
const HISTORY_LEAVE_EVENT = "huestima-history-leave";
const HISTORY_LEAVE_COMPLETE_EVENT = "huestima-history-leave-complete";

function formatDateTime(value, locale) {
  if (!Number.isFinite(value)) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getFamilyLabel(entry, t) {
  return t(`gameFamily.${normalizeGameFamily(entry?.gameFamily)}`);
}

function getModeLabel(entry, t) {
  return t(`gameMode.${entry?.gameMode || "normal"}`);
}

function getDifficultyLabel(entry, t) {
  return t(`difficulty.${entry?.difficulty || "easy"}`);
}

function getMatchTitle(entry, t) {
  return entry?.gameType === "multiplayer"
    ? t("history.multiplayer")
    : t("history.singleplayer");
}

function tileScoreTone(hex) {
  return readableTone(hex) === "dark" ? "text-zinc-950" : "text-white";
}

function colorTitleLabel(color, locale) {
  if (color?.left && color?.right) {
    return `${color.left.hex} / ${color.right.hex}`;
  }

  if (isFlagColor(color) || isCartoonColor(color)) {
    return `${getVisualLabel(color, locale)} ${color.hex}`.trim();
  }

  return color?.hex || "";
}

function getScoreColor(score, maxScore) {
  const safeMax = Math.max(1, Number(maxScore) || 0);
  const ratio = Math.max(0, Math.min((Number(score) || 0) / safeMax, 1));
  const hue = Math.round(ratio * 120);
  return `hsl(${hue} 100% 58%)`;
}

function RoundTiles({ results = [], locale, t }) {
  return (
    <div className="grid w-full grid-cols-5 overflow-hidden">
      {results.map((result, resultIndex) => (
        <div
          key={`${result.round}-${resultIndex}-${result.target?.flagId || result.target?.hex || result.target?.toneHex || "round"}`}
          className={`relative min-w-0 overflow-hidden ${
            isFlagColor(result.target) ? "aspect-[3/2]" : "aspect-square"
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
              background: gradientBackground(result.guess),
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

          <span
            className={`absolute left-1.5 top-1.5 z-10 max-w-[calc(100%-0.75rem)] truncate text-[clamp(0.86rem,3.15vw,1.05rem)] font-semibold leading-none tabular-nums sm:left-2 sm:top-2 sm:max-w-[calc(100%-1rem)] sm:text-[1.08rem] ${tileScoreTone(
              colorToneHex(result.target),
            )}`}
          >
            {formatScore(result.score)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MultiplayerRows({ leaderboard, currentPlayerId, locale, t }) {
  const rows = leaderboard?.leaderboard || [];
  const maxTotalScore =
    leaderboard?.maxTotalScore || (leaderboard?.totalRounds || 0) * 10;

  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const isLocal = row.playerId === currentPlayerId;

        return (
          <article key={row.playerId} className="shrink-0">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[1.05rem] font-semibold leading-none text-white sm:text-[1.18rem]">
                  {row.playerName}
                  {isLocal && (
                    <span className="ml-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/35">
                      {t("room.you")}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-sm text-white/42">#{row.rank}</p>
              </div>

              <div className="text-right">
                <p
                  className="text-[1.85rem] font-semibold leading-none sm:text-[2.1rem]"
                  style={{ color: getScoreColor(row.totalScore, maxTotalScore) }}
                >
                  {formatScore(row.totalScore)}
                </p>
                <p className="mt-2 text-sm text-white/42">
                  / {formatScore(maxTotalScore)}
                </p>
              </div>
            </div>

            <RoundTiles
              results={row.roundResults || []}
              locale={locale}
              t={t}
            />
          </article>
        );
      })}
    </div>
  );
}

function HistoryListItem({ entry, locale, t, onOpen }) {
  return (
    <article className="border-b border-white/10 py-4 last:border-b-0 sm:py-5">
      <button
        type="button"
        data-hover-sound="off"
        onClick={() => onOpen(entry)}
        className="flex w-full items-center justify-between gap-5 text-left"
      >
        <div className="min-w-0">
          <h2 className="truncate text-[1.02rem] font-semibold leading-none text-white sm:text-[1.1rem]">
            {getMatchTitle(entry, t)}
          </h2>
          <p className="mt-2 text-sm text-white/46">
            {getFamilyLabel(entry, t)} · {getModeLabel(entry, t)} ·{" "}
            {getDifficultyLabel(entry, t)} · {formatDateTime(entry.createdAt, locale)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className="text-[1.65rem] font-semibold leading-none sm:text-[1.9rem]"
            style={{ color: getScoreColor(entry.totalScore || 0, entry.maxScore || 1) }}
          >
            {formatScore(entry.totalScore || 0)}
          </p>
          <p className="mt-2 text-sm text-white/42">
            {entry.rounds || 0} {t("history.roundSuffix")}
          </p>
        </div>
      </button>
    </article>
  );
}

function EmptyState({ t }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <div className="text-center">
        <p className="text-[1.32rem] font-semibold text-white">
          {t("history.emptyTitle")}
        </p>
      </div>
    </div>
  );
}

function DetailHeader({ entry, locale, t, onBack }) {
  const maxScore = entry.maxScore || 0;
  const totalScore = entry.totalScore || 0;
  const scoreColor = getScoreColor(totalScore, maxScore);

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        aria-label={t("history.backToList")}
        className="solo-close-button absolute right-0 top-0 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:size-9"
      >
        <X className="size-6 sm:size-6.5" strokeWidth={1.7} />
      </button>

      <div data-screen-reveal className="max-w-100 pr-12 sm:pr-14">
        <div className="flex items-end gap-2">
          <p
            className="text-[clamp(3.2rem,11.5vw,4.45rem)] leading-[0.82] font-semibold tracking-normal"
            style={{ color: scoreColor }}
          >
            {formatScore(totalScore)}
          </p>
          <p className="pb-1 text-[clamp(1.15rem,4vw,1.5rem)] font-semibold leading-none text-white/35">
            / {formatScore(maxScore)}
          </p>
        </div>

        <div className="mt-5 border-t border-white/12 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="min-w-0 truncate text-[1.02rem] font-semibold leading-none text-white sm:text-[1.1rem]">
              {getMatchTitle(entry, t)}
            </h1>
            <time className="shrink-0 text-xs font-medium text-white/38 sm:text-sm">
              {formatDateTime(entry.createdAt, locale)}
            </time>
          </div>

          <p className="mt-3 text-sm font-medium leading-none text-white/54 sm:text-[0.96rem]">
            {getFamilyLabel(entry, t)}
            <span className="mx-2 text-white/22">/</span>
            {getModeLabel(entry, t)}
            <span className="mx-2 text-white/22">/</span>
            {getDifficultyLabel(entry, t)}
          </p>
        </div>
      </div>
    </>
  );
}

export default function HistoryPage({
  sharedMatch = "",
  selectedMatchId = "",
  initialView = "",
}) {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const scopeRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeEntry, setActiveEntry] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const isLeavingRef = useRef(false);
  const cardHeight = useResponsiveCardHeight(isExpanded);
  const listView = !activeEntry;
  const sharedEntry = useMemo(() => sharedMatch || null, [sharedMatch]);

  useEffect(() => {
    const savedEntries = readMatchHistory();
    setEntries(savedEntries);

    if (sharedEntry) {
      setActiveEntry(sharedEntry);
      return;
    }

    if (selectedMatchId || initialView === "detail") {
      const selectedEntry = getMatchHistoryEntry(selectedMatchId);
      if (selectedEntry) {
        setActiveEntry(selectedEntry);
      }
    }
  }, [initialView, selectedMatchId, sharedEntry]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsExpanded(true);
    }, 40);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleHistoryLeave = async () => {
      if (isLeavingRef.current) return;

      isLeavingRef.current = true;
      setIsLeaving(true);

      if (scopeRef.current) {
        await playScreenFadeOut(scopeRef.current, {
          duration: CONTENT_FADE_DURATION_MS / 1000,
        });
      }

      setIsExpanded(false);

      window.setTimeout(() => {
        window.dispatchEvent(new Event(HISTORY_LEAVE_COMPLETE_EVENT));
      }, CARD_RESIZE_DURATION_MS);
    };

    window.addEventListener(HISTORY_LEAVE_EVENT, handleHistoryLeave);

    return () => {
      window.removeEventListener(HISTORY_LEAVE_EVENT, handleHistoryLeave);
    };
  }, []);

  useScreenReveal(scopeRef, [listView, activeEntry?.id, entries.length, locale], {
    delay: 240,
  });

  const handleDelete = (entryId) => {
    const nextEntries = removeMatchHistoryEntry(entryId);
    setEntries(nextEntries);

    if (activeEntry?.id === entryId) {
      setActiveEntry(null);
      router.replace("/history", { scroll: false });
    }
  };

  const handleReplay = async () => {
    if (!activeEntry) return;

    const replayUrl = buildReplayMatchUrl(activeEntry);
    if (!replayUrl) return;

    if (scopeRef.current) {
      await playScreenFadeOut(scopeRef.current, {
        duration: CONTENT_FADE_DURATION_MS / 1000,
      });
    }

    router.push(replayUrl, { scroll: false });
  };

  const handleOpenDetail = async (entry) => {
    if (scopeRef.current) {
      await playScreenFadeOut(scopeRef.current, {
        duration: CONTENT_FADE_DURATION_MS / 1000,
      });
    }

    setActiveEntry(entry);
    setCopied(false);
    setCopyError(false);
    router.replace(`/history?match=${entry.id}&view=detail`, { scroll: false });
  };

  const handleBackToList = async () => {
    if (scopeRef.current) {
      await playScreenFadeOut(scopeRef.current, {
        duration: CONTENT_FADE_DURATION_MS / 1000,
      });
    }

    setActiveEntry(null);
    setCopied(false);
    setCopyError(false);
    router.replace("/history", { scroll: false });
  };

  const handleShare = async () => {
    if (!activeEntry) return;

    try {
      await navigator.clipboard.writeText(buildSharedMatchUrl(activeEntry));
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        className="relative flex w-full max-w-125 flex-col overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[0_18px_38px_rgba(0,0,0,0.28),0_8px_18px_rgba(0,0,0,0.18)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] sm:rounded-[26px] sm:p-8"
        style={cardHeight ? { height: cardHeight } : undefined}
      >
        <div
          ref={scopeRef}
          data-route-transition-scope
          className={`relative flex h-full min-h-0 flex-col ${
            isLeaving ? "opacity-0" : "opacity-100"
          }`}
        >
          {activeEntry ? (
            <>
              <DetailHeader
                entry={activeEntry}
                locale={locale}
                t={t}
                onBack={handleBackToList}
              />

              {copied || copyError ? (
                <p data-screen-reveal className="mt-4 text-sm text-white/54">
                  {copyError ? t("history.copyFailed") : t("history.copySuccess")}
                </p>
              ) : null}

              <div
                data-screen-reveal
                className="scrollbar-hidden mt-7 min-h-0 flex-1 overflow-y-auto pr-0.5"
              >
                {activeEntry.gameType === "multiplayer" ? (
                  <MultiplayerRows
                    leaderboard={activeEntry.leaderboard}
                    currentPlayerId={
                      activeEntry.leaderboard?.leaderboard?.find((row) => row.isCurrent)
                        ?.playerId
                    }
                    locale={locale}
                    t={t}
                  />
                ) : (
                  <div className="w-full max-w-[32rem]">
                    <RoundTiles
                      results={activeEntry.results || []}
                      locale={locale}
                      t={t}
                    />
                  </div>
                )}
              </div>

              <div data-screen-reveal className="mt-5 w-full max-w-[32rem]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid min-w-0 grid-cols-[3.625rem_minmax(0,1fr)] gap-3 sm:grid-cols-[3.875rem_minmax(0,1fr)]">
                    <button
                      type="button"
                      onClick={() => handleDelete(activeEntry.id)}
                      aria-label={t("history.deleteMatch")}
                      className="app-danger-action card-action-size grid place-items-center rounded-full bg-[#e53935] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7773]"
                    >
                      <Trash2 size={19} />
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="app-secondary-action card-action-height min-w-0 rounded-full border-2 border-white/90 bg-black px-4 text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Share2 size={18} />
                        {t("history.shareScore")}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleReplay}
                    className="rgb-hover-button card-action-height min-w-0 rounded-full bg-white px-4 text-base font-semibold text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Play size={18} />
                      {t("history.playAgain")}
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div data-screen-reveal>
                <h1 className="text-[clamp(2.8rem,7vw,3.75rem)] font-semibold leading-[0.92] tracking-normal text-white sm:text-[3.85rem]">
                  {t("history.listTitle")}
                </h1>
              </div>

              <div
                data-screen-reveal
                className="scrollbar-hidden mt-8 min-h-0 flex-1 overflow-y-auto pr-0.5"
              >
                {entries.length ? (
                  <div className="space-y-0">
                    {entries.map((entry) => (
                      <HistoryListItem
                        key={entry.id}
                        entry={entry}
                        locale={locale}
                        t={t}
                        onOpen={handleOpenDetail}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState t={t} />
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
