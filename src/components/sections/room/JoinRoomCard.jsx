"use client";

import { useEffect, useRef, useState } from "react";
import PlayerNameField, {
  readStoredPlayerName,
  storePlayerName,
  validatePlayerName,
} from "@/components/ui/PlayerNameField";
import PushNotification from "@/components/ui/PushNotification";
import { useTranslation } from "@/hooks/useLanguage";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import CardCloseButton from "@/components/ui/CardCloseButton";

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
  const scopeRef = useRef(null);
  const [playerName, setPlayerName] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [hiddenRemoteError, setHiddenRemoteError] = useState("");
  const [notification, setNotification] = useState(null);
  const requiresPassword = Boolean(room?.hasPassword);
  const actionError =
    nameError || passwordError || (error !== hiddenRemoteError ? error : "");

  useScreenReveal(scopeRef, [roomCode]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setPlayerName(readStoredPlayerName());
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!actionError) return undefined;

    // Notification state is intentionally synchronized from the room action result.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotification({
      id: `error-${Date.now()}`,
      message: actionError,
      variant: "error",
    });

    const timeoutId = window.setTimeout(() => {
      if (nameError) setNameError("");
      if (passwordError) setPasswordError("");
      if (error && actionError === error) setHiddenRemoteError(error);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [actionError, error, nameError, passwordError]);

  const handleJoin = async () => {
    if (isJoining) return;

    const validationError = validatePlayerName(playerName, t);
    if (validationError) {
      setNameError(validationError);
      setPasswordError("");
      setHiddenRemoteError(error);
      return;
    }

    if (requiresPassword && !password.trim()) {
      setNameError("");
      setPasswordError(t("setup.lobbyPasswordRequired"));
      setHiddenRemoteError(error);
      return;
    }

    setNameError("");
    setPasswordError("");
    setHiddenRemoteError("");
    await onJoin(storePlayerName(playerName), password.trim());
  };

  return (
    <div ref={scopeRef} className="relative flex h-full flex-col bg-black p-6 text-white sm:p-8">
      <PushNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      <CardCloseButton href="/color" label={t("common.backHome")} className="absolute right-4 top-4 sm:right-8 sm:top-8" />

      <div data-screen-reveal className="max-w-100 pr-10">
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

      <div data-screen-reveal className="mt-auto w-full">
        <div
          className={`grid w-full items-center gap-3 max-[520px]:grid-cols-1 ${
            requiresPassword
              ? "grid-cols-[1fr_1fr_0.9fr]"
              : "grid-cols-[1.08fr_1fr]"
          }`}
        >
          <PlayerNameField
            value={playerName}
            onChange={(value) => {
              setPlayerName(value);
              storePlayerName(value);
              if (nameError) setNameError("");
              if (passwordError) setPasswordError("");
              if (error) setHiddenRemoteError(error);
            }}
            disabled={isJoining}
          />

          {requiresPassword && (
            <input
              type="password"
              value={password}
              disabled={isJoining}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError("");
                if (error) setHiddenRemoteError(error);
              }}
              aria-label={t("setup.lobbyPasswordAria")}
              className="card-control-frame card-action-height w-full appearance-none px-7 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:ring-2 focus:ring-white/18 disabled:opacity-60"
              placeholder={t("setup.lobbyPasswordPlaceholder")}
              autoComplete="off"
            />
          )}

          <button
            type="button"
            disabled={isJoining}
            onClick={handleJoin}
            className="rgb-hover-button card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-center text-sm font-semibold leading-tight text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:text-base"
          >
            <span className="relative z-10 min-w-0 truncate">
              {isJoining ? t("room.joining") : t("room.join")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
