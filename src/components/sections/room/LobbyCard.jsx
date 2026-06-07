"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clipboard, Pencil, UserMinus, X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { useGameModeShock } from "@/hooks/useGameModeShock";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import DifficultySwitch from "@/components/ui/DifficultySwitch";
import GameModePicker from "@/components/ui/GameModePicker";
import { DIFFICULTY_IDS, GAME_MODE_OPTIONS } from "@/lib/constants";

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
const MULTIPLAYER_GAME_MODE_OPTIONS = GAME_MODE_OPTIONS.filter(
  (option) => !option.singleplayerOnly,
);

export default function LobbyCard({
  room,
  currentPlayerId,
  onCopyInvite,
  onStartGame,
  onKickPlayer,
  onGameModeChange,
  onDifficultyChange,
  onBackHome,
  isStarting,
  canStartGame = true,
  startDisabledLabel = "",
  isUpdatingSettings = false,
  error,
}) {
  const { t } = useTranslation();
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [hiddenActionError, setHiddenActionError] = useState("");
  const [difficultyBurst, setDifficultyBurst] = useState(null);
  const scopeRef = useRef(null);
  const copiedTimerRef = useRef(null);

  const isHost = room?.hostPlayerId === currentPlayerId;
  const isDifficultyLocked = Boolean(
    GAME_MODE_OPTIONS.find((option) => option.id === room?.gameMode)
      ?.lockedDifficultyId,
  );
  const players = room?.players || [];
  const gameModeLabel = t(`gameMode.${room?.gameMode || "normal"}`);
  const difficultyLabel = t(`difficulty.${room?.difficulty || "normal"}`);

  const activeActionError = error && error !== hiddenActionError ? error : "";
  const copyActionError = activeActionError && lastAction === "copy";
  const startActionError = activeActionError && lastAction === "start";
  const settingsActionError = activeActionError && lastAction === "settings";
  const kickActionError =
    activeActionError &&
    typeof lastAction === "string" &&
    lastAction.startsWith("kick:");
  const visibleActionError =
    copyActionError || startActionError || settingsActionError
      ? activeActionError
      : "";

  useGameModeShock(scopeRef, room?.gameMode);
  useScreenReveal(scopeRef, [room?.code], {
    delay: EXPANDED_REVEAL_DELAY,
  });

  const triggerDifficultyFeedback = (nextDifficulty, optionIndex = 1) => {
    const burst =
      DIFFICULTY_BURST_COLORS[nextDifficulty] ||
      DIFFICULTY_BURST_COLORS[DIFFICULTY_IDS.NORMAL];

    setDifficultyBurst({
      id: nextDifficulty,
      color: burst.color,
      rgb: burst.rgb,
      key: `${nextDifficulty}-${optionIndex}-${Date.now()}`,
    });
  };

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeActionError) return undefined;

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

  return (
    <div className="lobby-card relative isolate flex h-full flex-col overflow-hidden bg-black p-6 text-white sm:p-8">
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

      <div ref={scopeRef} className="relative z-10 flex h-full flex-col">
      <button
        data-game-mode-shock-target
        type="button"
        aria-label={t("common.backHome")}
        onClick={onBackHome}
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

          {kickActionError && (
            <p className="mt-3 text-xs font-semibold text-red-200">
              {activeActionError}
            </p>
          )}
        </div>

        {isSettingsOpen && (
          <div
            data-game-mode-shock-target
            className="lobby-settings-controls mt-4 grid w-full grid-cols-2 gap-3"
          >
            <GameModePicker
              value={room?.gameMode}
              onChange={handleGameModeChange}
              options={MULTIPLAYER_GAME_MODE_OPTIONS}
              disabled={!isHost || isUpdatingSettings || room?.status !== "lobby"}
              className="w-full"
            />

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
        )}

        {visibleActionError && (
          <p className="mt-3 text-xs font-semibold text-red-200">
            {visibleActionError}
          </p>
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
                className={`card-action-size grid shrink-0 place-items-center rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40 ${
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
                  ? "card-action-size grid shrink-0 place-items-center"
                  : "card-action-height inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-4 text-center text-sm font-semibold leading-tight sm:text-base"
              } ${
                copyActionError
                  ? "border-red-500 bg-red-500 text-white"
                  : isInviteCopied
                    ? "border-emerald-400 bg-emerald-400 text-white"
                    : "border-white/95 bg-transparent text-white hover:bg-white/10"
              }`}
            >
              {copyActionError ? (
                <X size={20} strokeWidth={2.35} />
              ) : isInviteCopied ? (
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
              <button
                type="button"
                onClick={handleStartGame}
                disabled={isStarting || !canStartGame}
                className={`lobby-primary-button card-action-height inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-5 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base ${
                  startActionError
                    ? "bg-red-500 text-white shadow-[0_16px_30px_rgba(239,68,68,0.22)]"
                    : "rgb-hover-button bg-white text-zinc-950"
                }`}
              >
                {startActionError && (
                  <X
                    className="relative z-10 shrink-0"
                    size={17}
                    strokeWidth={2.4}
                  />
                )}

                <span className="relative z-10 min-w-0 truncate">
                  {startActionError
                    ? activeActionError
                    : isStarting
                      ? t("room.starting")
                      : !canStartGame && startDisabledLabel
                        ? startDisabledLabel
                        : t("room.startGame")}
                </span>
              </button>
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
