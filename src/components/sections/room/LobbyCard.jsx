"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Pencil, UserMinus, X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { useGameModeShock } from "@/hooks/useGameModeShock";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import DifficultySwitch from "@/components/ui/DifficultySwitch";
import GameModePicker from "@/components/ui/GameModePicker";
import LevelCountPicker from "@/components/ui/LevelCountPicker";
import PushNotification from "@/components/ui/PushNotification";
import {
  DEFAULT_ROUND_COUNT,
  DIFFICULTY_IDS,
  GAME_MODE_IDS,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import { FLAG_OPTIONS } from "@/lib/flags";
import {
  isCartoonFamily,
  isFlagFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import { getAvailableGameModeOptions } from "@/lib/gameMode";

const DIFFICULTY_BURST_COLORS = {
  [DIFFICULTY_IDS.EASY]: {
    color: "#31e981",
    rgb: "49 233 129",
  },
  [DIFFICULTY_IDS.NORMAL]: {
    color: "#ffbd2f",
    rgb: "255 189 47",
  },
  [DIFFICULTY_IDS.HARD]: {
    color: "#ff3f46",
    rgb: "255 63 70",
  },
};
const EXPANDED_REVEAL_DELAY = 320;
const DIFFICULTY_BURST_LIFETIME_MS = 3900;
export default function LobbyCard({
  room,
  currentPlayerId,
  gameFamily = "color",
  onCopyInvite,
  onStartGame,
  onKickPlayer,
  onGameModeChange,
  onDifficultyChange,
  onRoundCountChange,
  onBackHome,
  isStarting,
  canStartGame = true,
  startDisabledLabel = "",
  isUpdatingSettings = false,
  isLeavingHome = false,
  error,
}) {
  const cleanGameFamily = normalizeGameFamily(gameFamily);
  const { t } = useTranslation();
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [hiddenActionError, setHiddenActionError] = useState("");
  const [notification, setNotification] = useState(null);
  const [difficultyBurst, setDifficultyBurst] = useState(null);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const scopeRef = useRef(null);
  const copiedTimerRef = useRef(null);
  const difficultyBurstTimerRef = useRef(null);

  const isHost = room?.hostPlayerId === currentPlayerId;
  const isDifficultyLocked = Boolean(
    GAME_MODE_OPTIONS.find((option) => option.id === room?.gameMode)
      ?.lockedDifficultyId,
  );
  const players = room?.players || [];
  const multiplayerGameModeOptions = useMemo(
    () =>
      getAvailableGameModeOptions(
        GAME_MODE_OPTIONS.filter((option) => !option.singleplayerOnly),
        cleanGameFamily,
      ),
    [cleanGameFamily],
  );
  const gameModeLabel = t(`gameMode.${room?.gameMode || "normal"}`);
  const difficultyLabel = t(`difficulty.${room?.difficulty || "normal"}`);

  const activeActionError = error && error !== hiddenActionError ? error : "";

  useGameModeShock(scopeRef, room?.gameMode);
  useCartoonAssetPreload(
    isFlagFamily(cleanGameFamily) || isCartoonFamily(cleanGameFamily),
    isFlagFamily(cleanGameFamily) ? FLAG_OPTIONS : undefined,
    "scene",
  );
  useFlagFullscreenLock(
    isFlagFamily(cleanGameFamily) || isCartoonFamily(cleanGameFamily),
  );
  useScreenReveal(scopeRef, [room?.code], {
    delay: EXPANDED_REVEAL_DELAY,
  });

  const triggerDifficultyFeedback = (nextDifficulty, optionIndex = 1) => {
    const burst =
      DIFFICULTY_BURST_COLORS[nextDifficulty] ||
      DIFFICULTY_BURST_COLORS[DIFFICULTY_IDS.NORMAL];

    if (difficultyBurstTimerRef.current) {
      window.clearTimeout(difficultyBurstTimerRef.current);
    }

    setDifficultyBurst({
      id: nextDifficulty,
      color: burst.color,
      rgb: burst.rgb,
      key: `${nextDifficulty}-${optionIndex}-${Date.now()}`,
    });

    difficultyBurstTimerRef.current = window.setTimeout(() => {
      setDifficultyBurst(null);
      difficultyBurstTimerRef.current = null;
    }, DIFFICULTY_BURST_LIFETIME_MS);
  };

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
      if (difficultyBurstTimerRef.current) {
        window.clearTimeout(difficultyBurstTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeActionError) return undefined;

    setNotification({
      id: `error-${Date.now()}`,
      message: activeActionError,
      variant: "error",
    });

    const timeoutId = window.setTimeout(() => {
      setHiddenActionError(activeActionError);
      setLastAction(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [activeActionError]);

  const handleToggleSettings = () => {
    if (!isHost || isUpdatingSettings) return;

    setHiddenActionError("");
    setLastAction(null);
    setIsSettingsOpen((current) => !current);
  };

  const handleCopyInvite = async () => {
    setLastAction("copy");
    setHiddenActionError("");

    const didCopy = await onCopyInvite();
    if (!didCopy) return;

    setLastAction(null);

    if (copiedTimerRef.current) {
      window.clearTimeout(copiedTimerRef.current);
    }

    setIsInviteCopied(true);
    setNotification({
      id: `success-${Date.now()}`,
      message: t("room.linkCopied"),
      variant: "success",
    });

    copiedTimerRef.current = window.setTimeout(() => {
      setIsInviteCopied(false);
    }, 2000);
  };

  const handleStartGame = () => {
    if (!canStartGame || isStarting) return;

    setLastAction("start");
    setHiddenActionError("");
    onStartGame();
  };

  const handleKickPlayer = (targetPlayerId) => {
    setLastAction(`kick:${targetPlayerId}`);
    setHiddenActionError("");
    onKickPlayer?.(targetPlayerId);
  };

  const handleGameModeChange = async (gameMode) => {
    setLastAction("settings");
    setHiddenActionError("");
    await onGameModeChange?.(gameMode);
  };

  const handleDifficultyChange = async (difficulty) => {
    setLastAction("settings");
    setHiddenActionError("");
    await onDifficultyChange?.(difficulty);
  };

  const handleRoundCountChange = async (roundCount) => {
    setLastAction("settings");
    setHiddenActionError("");
    await onRoundCountChange?.(roundCount);
  };

  const handleBackHome = () => {
    setIsLeaveConfirmOpen(true);
  };

  const handleConfirmBackHome = () => {
    setIsLeaveConfirmOpen(false);
    onBackHome?.();
  };

  return (
    <div className="lobby-card relative isolate flex h-full flex-col overflow-hidden bg-black p-6 text-white sm:p-8">
      <PushNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {isLeaveConfirmOpen && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[240] max-w-[calc(100vw-2rem)]">
          <div className="pointer-events-auto w-full max-w-[24rem] rounded-[24px] bg-black px-5 py-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.42)] sm:px-6 sm:py-6">
            <div className="max-w-[18.5rem]">
              <h3 className="text-lg font-semibold leading-tight text-white sm:text-xl">
                {t("common.backHome")}
              </h3>
              <p className="mt-3 text-sm font-medium leading-snug text-white/74 sm:text-[0.95rem]">
                {isHost ? t("room.confirmLeaveHost") : t("room.confirmLeaveGuest")}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLeaveConfirmOpen(false)}
                className="inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("common.no")}
              </button>
              <button
                type="button"
                onClick={handleConfirmBackHome}
                className="inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white/92 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("common.yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {difficultyBurst && (
        <span
          key={difficultyBurst.key}
          className={`difficulty-burst difficulty-burst--${difficultyBurst.id}`}
          style={{
            "--difficulty-burst-color": difficultyBurst.color,
            "--difficulty-burst-rgb": difficultyBurst.rgb,
          }}
          aria-hidden="true"
        />
      )}

      <div
        ref={scopeRef}
        className={`relative z-10 flex h-full flex-col transition-opacity duration-200 ${
          isLeavingHome ? "opacity-0" : "opacity-100"
        }`}
      >
      <button
        data-game-mode-shock-target
        type="button"
        aria-label={t("common.backHome")}
        onClick={handleBackHome}
        className="lobby-close-button solo-close-button absolute right-0 top-0 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:size-9"
      >
        <X className="size-6 sm:size-6.5" strokeWidth={1.7} />
      </button>

      <div data-screen-reveal className="pr-10">
        <h1
          data-game-mode-shock-target
          className="flex min-w-0 items-baseline gap-3 lowercase leading-none tracking-normal"
        >
          <span className="text-[clamp(3.6rem,13vw,5.1rem)] font-semibold text-white">
            {t("room.lobby")}
          </span>
          <span className="min-w-0 truncate pb-1 text-[clamp(1rem,3.2vw,1.45rem)] font-semibold text-white/34">
            #{room?.code}
          </span>
        </h1>

        <p
          data-game-mode-shock-target
          className="mt-4 max-w-[27rem] text-[0.98rem] font-semibold leading-tight text-white/82 sm:text-base"
        >
          {t("room.lobbySummary", {
            count: players.length,
            gameMode: gameModeLabel,
            difficulty: difficultyLabel,
            roundCount: room?.roundCount || DEFAULT_ROUND_COUNT,
          })}
        </p>
      </div>

      <div
        data-game-mode-shock-target
        className="mt-6 flex min-h-0 flex-1 flex-col justify-end"
      >
        <div data-screen-reveal className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-0.5">
          <div className="flex flex-wrap content-start gap-2">
            {players.map((player) => {
              const isCurrentPlayer = player.id === currentPlayerId;
              const canKickPlayer =
                isSettingsOpen &&
                isHost &&
                !isCurrentPlayer &&
                room?.status === "lobby" &&
                !player.isHost;

              return (
                <div
                  key={player.id}
                  data-game-mode-shock-target
                  className={`flex h-9 min-w-0 items-center gap-2 rounded-full px-3 ring-1 ${
                    isCurrentPlayer
                      ? "bg-white text-zinc-950 ring-white"
                      : "bg-white/[0.055] text-white ring-white/12"
                  }`}
                >
                  <span className="min-w-0 max-w-36 truncate text-[0.82rem] font-semibold leading-none sm:max-w-48 sm:text-sm">
                    {player.name}
                  </span>

                  {player.isHost && (
                    <span
                      className={`shrink-0 text-[0.58rem] font-bold leading-none tracking-[0.1em] uppercase ${
                        isCurrentPlayer ? "text-zinc-950/48" : "text-white/34"
                      }`}
                    >
                      {t("room.host")}
                    </span>
                  )}

                  {canKickPlayer && (
                    <button
                      type="button"
                      aria-label={t("room.kickPlayer", { name: player.name })}
                      title={t("room.kickPlayer", { name: player.name })}
                      onClick={() => handleKickPlayer(player.id)}
                      className={`grid size-6 shrink-0 place-items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        isCurrentPlayer
                          ? "bg-zinc-950/8 text-zinc-950/48"
                          : "bg-white/8 text-white/48 hover:bg-red-500 hover:text-white"
                      }`}
                    >
                      <UserMinus size={13} strokeWidth={2.35} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {isSettingsOpen && (
          <div
            data-game-mode-shock-target
            className="lobby-settings-controls mt-4 grid w-full grid-cols-2 gap-3"
          >
            <div className="order-1 min-w-0">
              <DifficultySwitch
                value={room?.difficulty}
                onChange={handleDifficultyChange}
                onSelectFeedback={triggerDifficultyFeedback}
                disabled={
                  isDifficultyLocked ||
                  !isHost ||
                  isUpdatingSettings ||
                  room?.status !== "lobby"
                }
                className="w-full"
              />
            </div>

            <div className="order-2 min-w-0">
              <LevelCountPicker
                value={room?.roundCount}
                onChange={handleRoundCountChange}
                disabled={!isHost || isUpdatingSettings || room?.status !== "lobby"}
                className="w-full"
              />
            </div>

            <div className="order-3 col-span-2 min-w-0">
              <GameModePicker
                value={room?.gameMode}
                onChange={handleGameModeChange}
                options={multiplayerGameModeOptions}
                disabled={
                  multiplayerGameModeOptions.length < 2 ||
                  !isHost ||
                  isUpdatingSettings ||
                  room?.status !== "lobby"
                }
                className="w-full"
              />
            </div>
          </div>
        )}

        <div data-game-mode-shock-target data-screen-reveal className="lobby-actions mt-3 w-full">
          <div className="flex w-full items-center gap-3">
            {isHost && (
              <button
                type="button"
                aria-label={
                  isSettingsOpen
                    ? t("room.closeSettings")
                    : t("room.editSettings")
                }
                title={
                  isSettingsOpen
                    ? t("room.closeSettings")
                    : t("room.editSettings")
                }
                onClick={handleToggleSettings}
                disabled={isUpdatingSettings}
                className={`game-action-pop card-action-size grid shrink-0 place-items-center rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSettingsOpen
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-white/95 bg-transparent text-white hover:bg-white/10"
                }`}
              >
                {isSettingsOpen ? (
                  <X size={20} strokeWidth={2.3} />
                ) : (
                  <Pencil size={18} strokeWidth={2.2} />
                )}
              </button>
            )}

            <button
              type="button"
              aria-label={t("room.copyInvite")}
              title={t("room.copyInvite")}
              onClick={handleCopyInvite}
              className={`rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                isHost
                  ? "game-action-pop card-action-size grid shrink-0 place-items-center"
                  : "card-action-height inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-4 text-center text-sm font-semibold leading-tight sm:text-base"
              } ${
                isInviteCopied
                    ? "border-emerald-400 bg-emerald-400 text-white"
                    : "border-white/95 bg-transparent text-white hover:bg-white/10"
              }`}
            >
              {isInviteCopied ? (
                <Check size={20} strokeWidth={2.35} />
              ) : (
                <Clipboard size={19} strokeWidth={2.15} />
              )}

              {!isHost && (
                <span className="min-w-0 truncate">
                  {isInviteCopied ? t("room.copied") : t("room.copyLink")}
                </span>
              )}
            </button>

            {isHost ? (
              <>
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={isStarting || !canStartGame}
                  className="rgb-hover-button lobby-primary-button card-action-height inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 text-center text-sm font-semibold leading-tight text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                >
                  <span className="relative z-10 min-w-0 truncate">
                    {isStarting
                        ? t("room.starting")
                        : !canStartGame && startDisabledLabel
                          ? startDisabledLabel
                          : t("room.startGame")}
                  </span>
                </button>
              </>
            ) : (
              <div className="card-action-height flex min-w-0 flex-1 items-center justify-center rounded-full bg-white/5.5 px-4 text-center text-sm font-semibold leading-tight text-white/58 ring-1 ring-white/12 sm:text-base">
                <span className="min-w-0 truncate">{t("room.waitingForHost")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
