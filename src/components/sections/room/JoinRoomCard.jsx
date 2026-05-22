"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import PlayerNameField, {
  cleanPlayerName,
  validatePlayerName,
} from "@/components/ui/PlayerNameField";
import { useTranslation } from "@/hooks/useLanguage";

function difficultyLabel(id, t) {
  return t(`difficulty.${id || "normal"}`).toLowerCase();
}

function gameModeLabel(id, t) {
  return t(`gameMode.${id || "normal"}`).toLowerCase();
}

export default function JoinRoomCard({
  room,
  roomCode,
  onJoin,
  isJoining,
  error,
}) {
  const { t } = useTranslation();
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [hiddenRemoteError, setHiddenRemoteError] = useState("");
  const actionError = nameError || (error !== hiddenRemoteError ? error : "");

  useEffect(() => {
    if (!actionError) return undefined;

    const timeoutId = window.setTimeout(() => {
      if (nameError) setNameError("");
      if (error && actionError === error) setHiddenRemoteError(error);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [actionError, error, nameError]);

  const handleJoin = async () => {
    if (isJoining) return;

    const validationError = validatePlayerName(playerName, t);
    if (validationError) {
      setNameError(validationError);
      setHiddenRemoteError(error);
      return;
    }

    setNameError("");
    setHiddenRemoteError("");
    await onJoin(cleanPlayerName(playerName));
  };

  return (
    <div className="relative flex h-full flex-col bg-black p-6 text-white sm:p-8">
      <Link
        href="/"
        aria-label={t("common.backHome")}
        className="solo-close-button absolute right-6 top-6 grid size-9 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8 sm:top-8"
      >
        <X size={26} strokeWidth={1.7} />
      </Link>

      <div className="max-w-100 pr-10">
        <h1 className="text-[clamp(3rem,10.5vw,4.2rem)] font-semibold lowercase leading-[0.98] tracking-normal text-white">
          {t("room.joinLobby")}
        </h1>

        <p className="mt-4 max-w-[25rem] text-[0.92rem] font-medium leading-[1.22] text-white/82 sm:text-[0.98rem]">
          {t("room.joinLobbyCopy", {
            roomCode: room?.code || roomCode,
            gameMode: gameModeLabel(room?.gameMode, t),
            difficulty: difficultyLabel(room?.difficulty, t),
          })}
        </p>
      </div>

      <div className="mt-auto grid w-full grid-cols-[1.08fr_1fr] items-center gap-3 max-[520px]:grid-cols-1">
        <PlayerNameField
          value={playerName}
          onChange={(value) => {
            setPlayerName(value);
            if (nameError) setNameError("");
            if (error) setHiddenRemoteError(error);
          }}
          disabled={isJoining}
        />

        <button
          type="button"
          disabled={isJoining}
          onClick={handleJoin}
          className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-5 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:text-base ${
            actionError
              ? "bg-red-500 text-white shadow-[0_16px_30px_rgba(239,68,68,0.22)]"
              : "rgb-hover-button bg-white text-zinc-950"
          }`}
        >
          {actionError && (
            <X
              className="relative z-10 shrink-0"
              size={17}
              strokeWidth={2.4}
            />
          )}

          <span className="relative z-10 min-w-0 truncate">
            {actionError || (isJoining ? t("room.joining") : t("room.join"))}
          </span>
        </button>
      </div>
    </div>
  );
}
