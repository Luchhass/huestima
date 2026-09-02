"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Pencil, UserMinus, X } from "lucide-react";
import gsap from "gsap";
import { useTranslation } from "@/hooks/useLanguage";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { useGameModeShock } from "@/hooks/useGameModeShock";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import DifficultySwitch from "@/components/ui/DifficultySwitch";
import FlagDifficultySwitch from "@/components/ui/FlagDifficultySwitch";
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
import {
  getLevelCountImpactPreset,
  playLevelCountRecoil,
} from "@/lib/levelCountFeedback";

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
const DIFFICULTY_BURST_LIFETIME_MS = 1180;

function getDifficultyBurstGeometry(card, origin, optionIndex) {
  const rect = card?.getBoundingClientRect();
  if (!rect) return { x: "50%", y: "78%", radius: "680px" };
  const fallbackX = rect.width * (0.18 + optionIndex * 0.16);
  const rawX = origin ? origin.clientX - rect.left : fallbackX;
  const rawY = origin ? origin.clientY - rect.top : rect.height * 0.78;
  const x = Math.max(0, Math.min(rect.width, rawX));
  const y = Math.max(0, Math.min(rect.height, rawY));
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
  return { x: `${x}px`, y: `${y}px`, radius: `${radius}px` };
}

function playDifficultyRecoil(card, origin, optionIndex) {
  if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cardRect = card.getBoundingClientRect();
  const source = origin || {
    clientX: cardRect.left + cardRect.width * (0.18 + optionIndex * 0.16),
    clientY: cardRect.top + cardRect.height * 0.78,
  };
  const strength = [7.5, 11, 15.5][optionIndex] || 11;
  const shake = [2.1, 3.1, 4.4][optionIndex] || 3.1;
  const targets = Array.from(card.querySelectorAll("[data-game-mode-shock-target]"))
    .filter((target) => !target.querySelector(".difficulty-switch"));

  targets.forEach((target, targetIndex) => {
    const response = target.dataset.gameModeShockWeight === "strong" ? 1.42 : 1;
    const rect = target.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - source.clientX;
    const dy = rect.top + rect.height / 2 - source.clientY;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const px = -uy;
    const py = ux;

    gsap.killTweensOf(target);
    gsap.timeline({ delay: targetIndex * 0.006 })
      .to(target, {
        x: ux * strength * response,
        y: uy * strength * response,
        duration: 0.065 + optionIndex * 0.008,
        ease: "power3.out",
        overwrite: true,
      })
      .to(target, {
        x: ux * strength * 0.68 * response + px * shake * response,
        y: uy * strength * 0.68 * response + py * shake * response,
        duration: 0.052,
        ease: "power1.inOut",
      })
      .to(target, {
        x: ux * strength * 0.43 * response - px * shake * 0.82 * response,
        y: uy * strength * 0.43 * response - py * shake * 0.82 * response,
        duration: 0.048,
        ease: "none",
      })
      .to(target, {
        x: ux * strength * 0.2 * response + px * shake * 0.46 * response,
        y: uy * strength * 0.2 * response + py * shake * 0.46 * response,
        duration: 0.052,
        ease: "none",
      })
      .to(target, {
        x: 0,
        y: 0,
        duration: 0.17 + optionIndex * 0.022,
        ease: `back.out(${1.35 + optionIndex * 0.12})`,
        clearProps: "transform",
      });
  });
}

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
  onFlagDifficultyChange,
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
  const [difficultyBursts, setDifficultyBursts] = useState([]);
  const [levelCountImpacts, setLevelCountImpacts] = useState([]);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const scopeRef = useRef(null);
  const cardRef = useRef(null);
  const copiedTimerRef = useRef(null);
  const difficultyBurstTimersRef = useRef(new Map());
  const levelCountImpactTimersRef = useRef(new Map());

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
  const isUnlimitedRoundMode =
    room?.gameMode === GAME_MODE_IDS.ENDLESS || room?.gameMode === GAME_MODE_IDS.SPRINT;
  const roundCountLabel = isUnlimitedRoundMode
    ? t("levelCount.infinity")
    : room?.roundCount || DEFAULT_ROUND_COUNT;
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

  const triggerDifficultyFeedback = (nextDifficulty, optionIndex = 1, origin = null) => {
    const burst =
      DIFFICULTY_BURST_COLORS[nextDifficulty] ||
      DIFFICULTY_BURST_COLORS[DIFFICULTY_IDS.NORMAL];

    const key = `${nextDifficulty}-${optionIndex}-${Date.now()}-${Math.random()}`;
    const geometry = getDifficultyBurstGeometry(cardRef.current, origin, optionIndex);
    setDifficultyBursts((current) => [...current, {
      id: nextDifficulty,
      color: burst.color,
      rgb: burst.rgb,
      key,
      ...geometry,
    }].slice(-6));
    playDifficultyRecoil(cardRef.current, origin, optionIndex);

    const timerId = window.setTimeout(() => {
      setDifficultyBursts((current) => current.filter((item) => item.key !== key));
      difficultyBurstTimersRef.current.delete(key);
    }, DIFFICULTY_BURST_LIFETIME_MS);
    difficultyBurstTimersRef.current.set(key, timerId);
  };

  const triggerLevelCountFeedback = ({ index = 0 }) => {
    if (!cardRef.current) return;
    const key = `level-${index}-${Date.now()}-${Math.random()}`;
    const preset = getLevelCountImpactPreset(index);
    const impact = {
      key,
      strength: preset.strength,
      spread: preset.spread,
      rise: `${preset.rise}s`,
      fade: `${preset.fade}s`,
    };

    levelCountImpactTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    levelCountImpactTimersRef.current.clear();
    setLevelCountImpacts([impact]);
    playLevelCountRecoil(cardRef.current, index);

    const timerId = window.setTimeout(() => {
      setLevelCountImpacts((current) => current.filter((item) => item.key !== key));
      levelCountImpactTimersRef.current.delete(key);
    }, (preset.rise + preset.fade) * 1000 + 120);
    levelCountImpactTimersRef.current.set(key, timerId);
  };

  useEffect(() => {
    const difficultyBurstTimers = difficultyBurstTimersRef.current;
    const levelCountImpactTimers = levelCountImpactTimersRef.current;
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
      difficultyBurstTimers.forEach((timerId) => window.clearTimeout(timerId));
      difficultyBurstTimers.clear();
      levelCountImpactTimers.forEach((timerId) => window.clearTimeout(timerId));
      levelCountImpactTimers.clear();
    };
  }, []);

  useEffect(() => {
    if (!activeActionError) return undefined;

    // Notification state is intentionally synchronized from the room action result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div ref={cardRef} className="lobby-card relative isolate flex h-full flex-col overflow-hidden bg-black p-6 text-white sm:p-8">
      <PushNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {isLeaveConfirmOpen && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[240] max-w-[calc(100vw-2rem)]">
          <div className="pointer-events-auto w-full max-w-[24rem] rounded-[24px] bg-black px-5 py-5 text-white shadow-[var(--app-card-shadow)] sm:px-6 sm:py-6">
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
                className="app-secondary-action inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("common.no")}
              </button>
              <button
                type="button"
                onClick={handleConfirmBackHome}
                className="rgb-hover-button inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("common.yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {difficultyBursts.map((difficultyBurst) => (
          <span
          key={difficultyBurst.key}
          className={`difficulty-burst difficulty-burst--${difficultyBurst.id}`}
          style={{
            "--difficulty-burst-color": difficultyBurst.color,
            "--difficulty-burst-rgb": difficultyBurst.rgb,
            "--difficulty-burst-x": difficultyBurst.x,
            "--difficulty-burst-y": difficultyBurst.y,
            "--difficulty-burst-radius": difficultyBurst.radius,
            }}
            aria-hidden="true"
          >
            <span className="difficulty-burst__wave" />
          </span>
      ))}

      {levelCountImpacts.map((impact) => (
        <span
          key={impact.key}
          aria-hidden="true"
          className="level-card-impact"
          style={{
            "--level-card-impact-strength": impact.strength,
            "--level-card-impact-spread": impact.spread,
            "--level-card-impact-rise": impact.rise,
            "--level-card-impact-fade": impact.fade,
          }}
        >
          <span className="level-card-impact__field" />
          <span className="level-card-impact__pressure" />
        </span>
      ))}

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
            roundCount: roundCountLabel,
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
                onImpact={triggerLevelCountFeedback}
                isEndless={isUnlimitedRoundMode}
                disabled={room?.gameMode === GAME_MODE_IDS.SPRINT || !isHost || isUpdatingSettings || room?.status !== "lobby"}
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

            {isFlagFamily(cleanGameFamily) && (
              <div className="order-4 col-span-2 min-w-0">
                <FlagDifficultySwitch
                  value={room?.flagDifficulty || "starter"}
                  onChange={onFlagDifficultyChange}
                  disabled={!isHost || isUpdatingSettings || room?.status !== "lobby"}
                />
              </div>
            )}

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
                className={`game-action-pop app-icon-action card-action-size grid shrink-0 place-items-center rounded-full border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40 ${
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
              className={`app-icon-action rounded-full border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
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
