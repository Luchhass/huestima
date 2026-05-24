"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import DifficultySwitch from "@/components/ui/DifficultySwitch";
import GameModeSwitch from "@/components/ui/GameModeSwitch";
import PlayerNameField, {
  cleanPlayerName,
  validatePlayerName,
} from "@/components/ui/PlayerNameField";
import { useGameModeShock } from "@/hooks/useGameModeShock";
import { useTranslation } from "@/hooks/useLanguage";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
} from "@/lib/constants";
import { emitWithAck } from "@/lib/socket";
import {
  createPlayerId,
  markInviteCopied,
  saveRoomSession,
} from "@/hooks/useRoomSession";

async function copyInviteLink(roomCode) {
  const inviteUrl = `${window.location.origin}/${roomCode}`;

  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(inviteUrl);
    markInviteCopied(roomCode);
  } catch {
    return false;
  }

  return true;
}

export default function MultiplayerCard({ onDifficultyFeedback }) {
  const router = useRouter();
  const { t } = useTranslation();
  const scopeRef = useRef(null);
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY_ID);
  const [gameMode, setGameMode] = useState(DEFAULT_GAME_MODE_ID);
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const actionError = nameError || submitError;
  const description = `${t(
    `setup.multiCopy.${gameMode || DEFAULT_GAME_MODE_ID}`,
  )} ${t(`setup.difficultyCopy.${difficulty || DEFAULT_DIFFICULTY_ID}`)}`;

  useGameModeShock(scopeRef, gameMode);

  const clearActionError = () => {
    if (nameError) setNameError("");
    if (submitError) setSubmitError("");
  };

  useEffect(() => {
    if (!actionError) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNameError("");
      setSubmitError("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [actionError]);

  const handleCreate = async () => {
    if (isCreating) return;

    const validationError = validatePlayerName(playerName, t);

    if (validationError) {
      setNameError(validationError);
      setSubmitError("");
      return;
    }

    setNameError("");
    setSubmitError("");
    setIsCreating(true);

    const cleanName = cleanPlayerName(playerName);
    const playerId = createPlayerId();

    const response = await emitWithAck("room:create", {
      playerId,
      playerName: cleanName,
      difficulty,
      gameMode,
    });

    if (!response.ok) {
      setIsCreating(false);
      setSubmitError(response.error || t("setup.couldNotCreate"));
      return;
    }

    saveRoomSession(response.room.code, {
      playerId,
      playerName: cleanName,
      isHost: true,
    });

    void copyInviteLink(response.room.code);
    router.push(`/${response.room.code}`);
  };

  return (
    <div ref={scopeRef} className="home-view-panel flex h-full flex-col">
      <div data-screen-reveal className="home-view-copy max-w-[23rem] pr-10">
        <h1
          data-game-mode-shock-target
          className="text-[clamp(2.15rem,10.5vw,3.15rem)] font-semibold lowercase leading-[0.88] tracking-normal text-white sm:text-[4.05rem]"
        >
          {t("setup.multiplayer")}
        </h1>

        <p
          data-game-mode-shock-target
          className="mt-4 text-[0.92rem] font-medium leading-[1.22] text-white/82 sm:text-[0.98rem]"
        >
          {description}
        </p>
      </div>

      <div data-screen-reveal className="home-view-actions mt-auto w-full">
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:gap-3">
          <div data-game-mode-shock-target className="min-w-0">
            <GameModeSwitch
              value={gameMode}
              onChange={(value) => {
                setGameMode(value);
                clearActionError();
              }}
              disabled={isCreating}
            />
          </div>

          <div data-game-mode-shock-target className="min-w-0">
            <DifficultySwitch
              value={difficulty}
              onChange={(value) => {
                setDifficulty(value);
                clearActionError();
              }}
              onSelectFeedback={onDifficultyFeedback}
              disabled={isCreating}
            />
          </div>
        </div>
      </div>

      <div data-screen-reveal className="home-view-actions mt-3 w-full">
        <div className="grid w-full grid-cols-[1.08fr_1fr] items-center gap-2 sm:grid-cols-2 sm:gap-3">
          <div data-game-mode-shock-target className="min-w-0">
            <PlayerNameField
              value={playerName}
              onChange={(value) => {
                setPlayerName(value);
                clearActionError();
              }}
              disabled={isCreating}
            />
          </div>

          <button
            data-game-mode-shock-target
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-base ${
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

            <span className="relative z-10">
              {actionError || (isCreating ? t("setup.creating") : t("setup.createLobby"))}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
