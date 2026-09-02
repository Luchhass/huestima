"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Play, Share2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import {
  playScreenFadeOut,
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import { markDownloadReturn } from "@/hooks/useFooterPageTransition";
import { useTranslation } from "@/hooks/useLanguage";
import {
  readStoredPlayerName,
  validatePlayerName,
} from "@/components/ui/PlayerNameField";
import { pushNotification } from "@/components/ui/GlobalPushNotifications";
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
  isBrandColor,
  isFlagColor,
  readableTone,
} from "@/lib/color";
import CartoonOverlay from "@/components/ui/game/CartoonOverlay";
import FlagOverlay from "@/components/ui/game/FlagOverlay";
import BrandOverlay from "@/components/ui/game/BrandOverlay";
import EmptyState from "@/components/ui/EmptyState";

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

  if (isFlagColor(color) || isCartoonColor(color) || isBrandColor(color)) {
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
              background: gradientBackground(result.guess),
              clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
            }}
          />

          {isFlagColor(result.target) && (
            <FlagOverlay
              color={result.guess}
              className="z-[1]"
              minRenderWidth={360}
            />
          )}

          {isCartoonColor(result.target) && (
            <CartoonOverlay
              color={result.guess}
              variant="tile"
              size="tile"
              className="z-[2]"
              minRenderWidth={360}
            />
          )}

          {isBrandColor(result.target) && (
            <BrandOverlay color={result.guess} className="z-[2]" size="tile" />
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

function HistoryEmptyState({ t }) {
  return <EmptyState title={t("history.emptyTitle")} />;
}

function DetailHeader({ entry, locale, t, onBack, sharedBy = "" }) {
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

        <div className="mt-5 space-y-2.5">
          {sharedBy ? (
            <p className="text-sm font-semibold text-white/72">
              {t("history.sharedByline", { name: sharedBy })}
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-[1.02rem] font-semibold leading-none text-white sm:text-[1.1rem]">
              {getMatchTitle(entry, t)}
            </h1>
            <span aria-hidden="true" className="text-white/22">
              ·
            </span>
            <time className="text-xs font-medium text-white/42 sm:text-sm">
              {formatDateTime(entry.createdAt, locale)}
            </time>
          </div>

          <p className="text-sm font-medium leading-none text-white/50 sm:text-[0.96rem]">
            {getFamilyLabel(entry, t)}
            <span className="mx-2 text-white/24">·</span>
            {getModeLabel(entry, t)}
            <span className="mx-2 text-white/24">·</span>
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
  initialFrom = "color",
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
  const isSharedView = Boolean(sharedEntry);
  const from = ["color", "flag", "cartoon", "brand", "team"].includes(initialFrom)
    ? initialFrom
    : "color";

  useEffect(() => {
    const savedEntries = readMatchHistory();
    // History is hydrated from browser storage after the client becomes available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const timeoutId = window.setTimeout(() => setIsExpanded(true), 40);
    const revealTimeoutId = window.setTimeout(() => {
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    }, 780);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(revealTimeoutId);
    };
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

  useScreenReveal(scopeRef, [listView, activeEntry?.id, locale], { defer: true });

  const replayReveal = () => {
    window.setTimeout(() => {
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    }, 80);
  };

  const handleClose = async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    setIsLeaving(true);
    await playScreenFadeOut(scopeRef, { duration: 0.24 });
    setIsExpanded(false);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    markDownloadReturn();
    router.push(`/${from}`);
  };

  const handleDelete = (entryId) => {
    const nextEntries = removeMatchHistoryEntry(entryId);
    setEntries(nextEntries);
    pushNotification(t("history.deleteSuccess"), "success");

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
    replayReveal();
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
    replayReveal();
  };

  const handleShare = async () => {
    if (!activeEntry) return;

    const playerName = readStoredPlayerName();
    const validationError = validatePlayerName(playerName, t);
    if (validationError) {
      pushNotification(t("history.shareNameRequired"), "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildSharedMatchUrl(activeEntry, playerName),
      );
      setCopyError(false);
      setCopied(true);
      pushNotification(t("history.copySuccess"), "success");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
      pushNotification(t("history.copyFailed"), "error");
    }
  };

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        data-history-card
        className="relative flex w-full max-w-125 flex-col overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[var(--app-card-shadow)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] sm:rounded-[26px] sm:p-8"
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
                sharedBy={isSharedView ? activeEntry.sharedBy : ""}
              />

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

              {!isSharedView ? (
                <div data-screen-reveal className="mt-5 w-full max-w-[32rem]">
                  <div className="flex items-center gap-3">
                    <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(activeEntry.id)}
                        aria-label={t("history.deleteMatch")}
                        className="app-secondary-action card-action-size inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white/90 bg-black p-0 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <Trash2 size={19} />
                      </button>

                      <button
                        type="button"
                        onClick={handleShare}
                        aria-label={
                          copied ? t("history.copySuccess") : t("history.shareScore")
                        }
                        title={copied ? t("history.copySuccess") : t("history.shareScore")}
                        className={`app-secondary-action card-action-height card-action-size inline-flex min-w-0 items-center justify-center rounded-full border-2 p-0 text-center text-base font-semibold focus:outline-none focus-visible:ring-2 sm:min-w-0 sm:flex-1 sm:px-4 ${
                          copied
                            ? "border-emerald-300 bg-emerald-400 text-zinc-950 focus-visible:ring-emerald-200"
                            : copyError
                              ? "border-red-300 bg-red-500 text-white focus-visible:ring-red-200"
                              : "border-white/90 bg-black text-white focus-visible:ring-white/70"
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          {copied ? <Check size={19} /> : <Share2 size={18} />}
                          <span className="hidden sm:inline">
                            {t("history.shareScore")}
                          </span>
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleReplay}
                      className="rgb-hover-button card-action-height inline-flex min-w-0 flex-1 items-center justify-center rounded-full bg-white px-3 text-center text-base font-semibold text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-4"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Play size={18} />
                        {t("history.playAgain")}
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <button
                type="button"
                onClick={() => void handleClose()}
                aria-label={t("history.backToList")}
                className="absolute right-0 top-0 z-20 grid size-9 place-items-center rounded-full text-white/75 transition-opacity hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <X className="size-6" strokeWidth={1.7} />
              </button>
              <div data-screen-reveal className="pr-10">
                <h1 className="text-[clamp(2.8rem,7vw,3.75rem)] font-semibold leading-[0.92] tracking-normal text-white sm:text-[3.85rem]">
                  {t("history.listTitle")}
                </h1>
                <p className="mt-5 max-w-[26rem] text-sm font-medium leading-[1.4] text-white/68 sm:text-base">
                  {t("history.intro")}
                </p>
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
                  <HistoryEmptyState t={t} />
                )}
              </div>
            </div>
          )}
        </div>

      </section>
    </main>
  );
}
