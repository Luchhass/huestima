"use client";

import { useEffect, useRef, useState } from "react";
import { Check, UserMinus, X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";

function difficultyLabel(id, t) {
  return t(`difficulty.${id || "normal"}`);
}

function gameModeLabel(id, t) {
  return t(`gameMode.${id || "normal"}`);
}

export default function LobbyCard({
  room,
  currentPlayerId,
  onCopyInvite,
  onStartGame,
  onKickPlayer,
  onBackHome,
  isStarting,
  error,
}) {
  const { t } = useTranslation();
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [hiddenActionError, setHiddenActionError] = useState("");
  const copiedTimerRef = useRef(null);

  const isHost = room?.hostPlayerId === currentPlayerId;
  const players = room?.players || [];

  const activeActionError = error && error !== hiddenActionError ? error : "";
  const copyActionError =
    activeActionError && (lastAction === "copy" || (!isHost && !lastAction));
  const startActionError =
    activeActionError && (lastAction === "start" || (isHost && !lastAction));
  const kickActionError =
    activeActionError &&
    typeof lastAction === "string" &&
    lastAction.startsWith("kick:");

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
    setLastAction("start");
    setHiddenActionError("");
    onStartGame();
  };

  const handleKickPlayer = (targetPlayerId) => {
    setLastAction(`kick:${targetPlayerId}`);
    setHiddenActionError("");
    onKickPlayer?.(targetPlayerId);
  };

  return (
    <div className="relative flex h-full flex-col bg-black p-6 text-white sm:p-8">
      <button
        type="button"
        aria-label={t("common.backHome")}
        onClick={onBackHome}
        className="solo-close-button absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8 sm:top-8 sm:size-9"
      >
        <X className="size-6 sm:size-6.5" strokeWidth={1.7} />
      </button>

      <div className="max-w-[26.25rem] pr-10">
        <h1 className="text-[clamp(3.35rem,11vw,4.7rem)] font-semibold lowercase leading-[0.98] tracking-normal text-white">
          {t("room.lobby")}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/14 bg-white/7 px-3 py-2 text-[0.72rem] font-bold leading-none tracking-[0.16em] text-white">
            {room?.code}
          </span>

          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[0.72rem] font-bold leading-none tracking-[0.09em] text-white/68 uppercase">
            {difficultyLabel(room?.difficulty, t)}
          </span>

          <span className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-[0.72rem] font-bold leading-none tracking-[0.09em] text-white/68 uppercase">
            {gameModeLabel(room?.gameMode, t)}
          </span>
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-[0.72rem] font-bold tracking-[0.14em] text-white/62 uppercase">
            {t("room.players")}
          </p>

          <p className="rounded-full bg-white/7 px-2.5 py-1 text-[0.68rem] font-bold leading-none text-white/48">
            {t("room.joinedCount", { count: players.length })}
          </p>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {players.map((player) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const canKickPlayer =
              isHost &&
              !isCurrentPlayer &&
              room?.status === "lobby" &&
              !player.isHost;

            return (
              <div key={player.id}>
                <div
                  className={`flex h-12 items-center justify-between gap-3 rounded-full px-4 ring-1 ${
                    isCurrentPlayer
                      ? "bg-white text-zinc-950 ring-white"
                      : "bg-white/5.5 text-white ring-white/12"
                  }`}
                >
                  <span className="min-w-0 truncate text-sm font-semibold sm:text-[0.95rem]">
                    {player.name}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {player.isHost && (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.58rem] font-bold leading-none tracking-[0.12em] uppercase ${
                          isCurrentPlayer
                            ? "bg-zinc-950 text-white"
                            : "bg-white text-zinc-950"
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
                        className="grid size-7 place-items-center rounded-full bg-white/8 text-white/58 transition hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <UserMinus size={15} strokeWidth={2.25} />
                      </button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {kickActionError && (
          <p className="mt-2 text-xs font-semibold text-red-200">
            {activeActionError}
          </p>
        )}
      </div>

      <div className="mt-5 grid w-full grid-cols-2 items-center gap-3 max-[520px]:grid-cols-1">
        <button
          type="button"
          onClick={handleCopyInvite}
          className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-5 text-center text-sm font-semibold leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-base ${
            copyActionError
              ? "border-red-500 bg-red-500 text-white"
              : isInviteCopied
                ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                : "border-white/18 bg-white/5.5 text-white hover:border-white/34 hover:bg-white/10"
          }`}
        >
          {copyActionError ? (
            <X size={17} strokeWidth={2.4} />
          ) : (
            isInviteCopied && <Check size={17} strokeWidth={2.4} />
          )}

          <span className="min-w-0 truncate">
            {copyActionError
              ? activeActionError
              : isInviteCopied
                ? t("room.linkCopied")
                : t("room.copyInvite")}
          </span>
        </button>

        {isHost ? (
          <button
            type="button"
            onClick={handleStartGame}
            disabled={isStarting}
            className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-5 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:text-base ${
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
                  : t("room.startGame")}
            </span>
          </button>
        ) : (
          <div
            className="card-action-height flex min-w-0 items-center justify-center rounded-full bg-white/5.5 px-5 text-center text-sm font-semibold leading-tight text-white/58 ring-1 ring-white/12 sm:text-base"
          >
            <span className="min-w-0 truncate">{t("room.waitingForHost")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
