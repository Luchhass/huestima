"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Settings, UserMinus, X } from "lucide-react";
import gsap from "gsap";
import { useTranslation } from "@/hooks/useLanguage";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { useGameModeShock } from "@/hooks/useGameModeShock";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import CartoonPoolPicker from "@/components/ui/CartoonPoolPicker";
import DifficultySwitch from "@/components/ui/DifficultySwitch";
import FlagPoolPicker from "@/components/ui/FlagPoolPicker";
import GameModePicker from "@/components/ui/GameModePicker";
import LevelCountPicker from "@/components/ui/LevelCountPicker";
import PushNotification from "@/components/ui/PushNotification";
import TeamPoolPicker from "@/components/ui/TeamPoolPicker";
import UnifiedModal from "@/components/ui/UnifiedModal";
import { CARTOON_PACKS } from "@/lib/cartoons";
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
  isTeamFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import { getAvailableGameModeOptions } from "@/lib/gameMode";
import { getPoolLinkLabel } from "@/lib/poolSelection";
import { TEAM_OPTIONS } from "@/lib/teams";
import {
  getLevelCountImpactPreset,
  playLevelCountRecoil,
} from "@/lib/levelCountFeedback";
import { isFixedMultiplayerRoundMode } from "../../../../shared/gameMechanics.mjs";

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
const ALL_CARTOON_IDS = CARTOON_PACKS.flatMap((pack) => pack.itemIds);
const ALL_TEAM_IDS = TEAM_OPTIONS.map((team) => team.id);

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
  onSaveSettings,
  onBackHome,
  isStarting,
  canStartGame = true,
  startDisabledLabel = "",
  isUpdatingSettings = false,
  isLeavingHome = false,
  error,
}) {
  const cleanGameFamily = normalizeGameFamily(gameFamily);
  const { locale, t } = useTranslation();
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsPool, setSettingsPool] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);
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
    room?.gameMode === GAME_MODE_IDS.ENDLESS ||
    isFixedMultiplayerRoundMode(room?.gameMode);
  const roundCountLabel = isUnlimitedRoundMode
    ? t("levelCount.infinity")
    : room?.roundCount || DEFAULT_ROUND_COUNT;
  const difficultyLabel = t(`difficulty.${room?.difficulty || "normal"}`);
  const activeSettings = draftSettings || {
    gameMode: room?.gameMode,
    difficulty: room?.difficulty,
    roundCount: room?.roundCount,
    flagDifficulty: room?.flagDifficulty || "starter",
    flagDifficulties: room?.flagDifficulties || [room?.flagDifficulty || "starter"],
    cartoonIds: room?.cartoonIds || ALL_CARTOON_IDS,
    teamIds: room?.teamIds || ALL_TEAM_IDS,
  };
  const activeModeOption = GAME_MODE_OPTIONS.find(
    (option) => option.id === activeSettings.gameMode,
  );
  const settingsDifficultyLocked = Boolean(activeModeOption?.lockedDifficultyId);
  const settingsRoundCountLocked =
    activeSettings.gameMode === GAME_MODE_IDS.ENDLESS ||
    isFixedMultiplayerRoundMode(activeSettings.gameMode);

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
  useScreenReveal(scopeRef, [room?.code, isSettingsOpen, settingsPool], {
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

  const transitionSettingsView = async (nextOpen) => {
    if (!isHost || isUpdatingSettings) return;

    setHiddenActionError("");
    setLastAction(null);
    if (scopeRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await new Promise((resolve) => {
        gsap.to(scopeRef.current, {
          autoAlpha: 0,
          duration: 0.42,
          ease: "power2.inOut",
          onComplete: resolve,
        });
      });
    }
    if (nextOpen) {
      setDraftSettings({
        gameMode: room?.gameMode,
        difficulty: room?.difficulty,
        roundCount: room?.roundCount,
        flagDifficulty: room?.flagDifficulty || "starter",
        flagDifficulties: room?.flagDifficulties || [room?.flagDifficulty || "starter"],
        cartoonIds: room?.cartoonIds || ALL_CARTOON_IDS,
        teamIds: room?.teamIds || ALL_TEAM_IDS,
      });
    } else {
      setDraftSettings(null);
    }
    setSettingsPool(null);
    setIsSettingsOpen(nextOpen);
  };

  const handleOpenSettings = () => transitionSettingsView(true);
  const handleCloseSettings = () => transitionSettingsView(false);

  const transitionSettingsPool = async (nextPool) => {
    if (isUpdatingSettings) return;
    if (scopeRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await new Promise((resolve) => {
        gsap.to(scopeRef.current, {
          autoAlpha: 0,
          duration: 0.42,
          ease: "power2.inOut",
          onComplete: resolve,
        });
      });
    }
    setSettingsPool(nextPool);
  };

  const handleSaveSettings = async () => {
    if (!draftSettings || isUpdatingSettings) return;

    setLastAction("settings");
    setHiddenActionError("");
    const response = await onSaveSettings?.(draftSettings);
    if (response?.ok === false) return;

    await transitionSettingsView(false);
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

      <UnifiedModal
        open={isLeaveConfirmOpen}
        title={t("common.backHome")}
        description={isHost ? t("room.confirmLeaveHost") : t("room.confirmLeaveGuest")}
        closeLabel={t("common.no")}
        cancelLabel={t("common.no")}
        confirmLabel={t("common.yes")}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={handleConfirmBackHome}
      />

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
        aria-label={isSettingsOpen ? t("room.closeSettings") : t("common.backHome")}
        onClick={isSettingsOpen ? handleCloseSettings : handleBackHome}
        className="lobby-close-button solo-close-button absolute right-0 top-0 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:size-9"
      >
        <X className="size-6 sm:size-6.5" strokeWidth={1.7} />
      </button>

      {isSettingsOpen ? (
        settingsPool === "cartoon" ? (
          <CartoonPoolPicker
            value={activeSettings.cartoonIds}
            onChange={(cartoonIds) => setDraftSettings((current) => ({ ...current, cartoonIds }))}
            onDone={() => transitionSettingsPool(null)}
          />
        ) : settingsPool === "flag" ? (
          <FlagPoolPicker
            value={activeSettings.flagDifficulties}
            onChange={(flagDifficulties) => setDraftSettings((current) => ({
              ...current,
              flagDifficulties,
              flagDifficulty: flagDifficulties[0] || current.flagDifficulty,
            }))}
            onDone={() => transitionSettingsPool(null)}
          />
        ) : settingsPool === "team" ? (
          <TeamPoolPicker
            value={activeSettings.teamIds}
            onChange={(teamIds) => setDraftSettings((current) => ({ ...current, teamIds }))}
            onDone={() => transitionSettingsPool(null)}
          />
        ) : (
        <>
          <div data-screen-reveal className="pr-10">
            <h1
              data-game-mode-shock-target
              className="text-[clamp(2.3rem,9.2vw,3.2rem)] font-semibold lowercase leading-[0.9] tracking-normal text-white sm:text-[4.05rem]"
            >
              {t("room.lobbySettings")}
            </h1>
            <p
              data-game-mode-shock-target
              className="mt-3.5 max-w-[35.5rem] text-[0.9rem] font-medium leading-[1.28] text-white/84 sm:mt-4 sm:max-w-[36.75rem] sm:text-[0.96rem]"
            >
              {t("room.lobbySummary", {
                count: players.length,
                gameMode: t(`gameMode.${activeSettings.gameMode || "normal"}`),
                difficulty: t(`difficulty.${activeSettings.difficulty || "normal"}`),
                roundCount: settingsRoundCountLocked
                  ? t("levelCount.infinity")
                  : activeSettings.roundCount || DEFAULT_ROUND_COUNT,
              })}
            </p>
          </div>

          <div data-screen-reveal className="home-view-actions mt-auto w-full">
            {(isCartoonFamily(cleanGameFamily) || isFlagFamily(cleanGameFamily) || isTeamFamily(cleanGameFamily)) && (
              <button
                type="button"
                onClick={() => transitionSettingsPool(cleanGameFamily)}
                disabled={isUpdatingSettings || room?.status !== "lobby"}
                className="mb-3 px-1 text-left text-xs font-semibold text-white/65 underline decoration-current underline-offset-4 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {getPoolLinkLabel(cleanGameFamily, locale, activeSettings)}
              </button>
            )}
            <div className="grid w-full grid-cols-2 items-center gap-2 sm:gap-3">
              <div data-game-mode-shock-target className="min-w-0">
                <DifficultySwitch
                  value={activeSettings.difficulty}
                  onChange={(difficulty) => setDraftSettings((current) => ({ ...current, difficulty }))}
                  onSelectFeedback={triggerDifficultyFeedback}
                  disabled={settingsDifficultyLocked || isUpdatingSettings || room?.status !== "lobby"}
                />
              </div>
              <div data-game-mode-shock-target className="min-w-0">
                <LevelCountPicker
                  value={activeSettings.roundCount}
                  onChange={(roundCount) => setDraftSettings((current) => ({ ...current, roundCount }))}
                  onImpact={triggerLevelCountFeedback}
                  isEndless={settingsRoundCountLocked}
                  disabled={settingsRoundCountLocked || isUpdatingSettings || room?.status !== "lobby"}
                />
              </div>
            </div>
          </div>

          <div data-screen-reveal className="home-view-actions mt-3 w-full">
            <div className="grid w-full grid-cols-2 items-end gap-2 sm:gap-3">
              <div data-game-mode-shock-target data-game-mode-shock-weight="strong" className="min-w-0">
                <GameModePicker
                  value={activeSettings.gameMode}
                  onChange={(gameMode) => setDraftSettings((current) => {
                    const lockedDifficultyId = GAME_MODE_OPTIONS.find((option) => option.id === gameMode)?.lockedDifficultyId;
                    return {
                      ...current,
                      gameMode,
                      difficulty: lockedDifficultyId || current.difficulty,
                    };
                  })}
                  options={multiplayerGameModeOptions}
                  disabled={multiplayerGameModeOptions.length < 2 || isUpdatingSettings || room?.status !== "lobby"}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isUpdatingSettings || room?.status !== "lobby"}
                className="rgb-hover-button card-action-height inline-flex w-full min-w-0 items-center justify-center rounded-full bg-white px-4 text-[0.95rem] font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:px-6 sm:text-base"
              >
                <span className="relative z-10">{t("room.saveSettings")}</span>
              </button>
            </div>
          </div>
        </>
        )
      ) : (
        <>
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

        <div data-game-mode-shock-target data-screen-reveal className="lobby-actions mt-3 w-full">
          <div className={`w-full items-center gap-3 ${
            isHost
              ? "grid grid-cols-[3.625rem_minmax(0,1fr)_50%]"
              : "flex"
          }`}>
            {isHost && (
              <button
                type="button"
                aria-label={t("room.editSettings")}
                title={t("room.editSettings")}
                onClick={handleOpenSettings}
                disabled={isUpdatingSettings}
                className="game-action-pop app-icon-action card-action-size grid shrink-0 place-items-center rounded-full border-2 border-white/95 bg-transparent text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Settings size={19} strokeWidth={2.15} />
              </button>
            )}

            <button
              type="button"
              aria-label={t("room.copyInvite")}
              title={t("room.copyInvite")}
              onClick={handleCopyInvite}
              className={`app-icon-action card-action-height inline-flex min-w-0 items-center justify-center rounded-full border-2 px-4 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-base ${
                isHost ? "w-full" : "flex-1"
              } ${
                isInviteCopied
                    ? "border-emerald-400 bg-emerald-400 text-white"
                    : "border-white/95 bg-transparent text-white hover:bg-white/10"
              }`}
            >
              <span className="min-w-0 truncate">
                {isInviteCopied ? t("room.copied") : t("room.copyLink")}
              </span>
            </button>

            {isHost ? (
              <>
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={isStarting || !canStartGame}
                  className="rgb-hover-button lobby-primary-button card-action-height inline-flex min-w-0 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-center text-sm font-semibold leading-tight text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
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
        </>
      )}
      </div>
    </div>
  );
}
