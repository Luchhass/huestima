"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Globe2,
  Lock,
  LogIn,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import PlayerNameField, {
  cleanPlayerName,
  validatePlayerName,
} from "@/components/ui/PlayerNameField";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import { useTranslation } from "@/hooks/useLanguage";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
} from "@/lib/constants";
import { emitWithAck, getSocket } from "@/lib/socket";
import {
  createPlayerId,
  markInviteCopied,
  saveRoomSession,
} from "@/hooks/useRoomSession";
import { trackEvent } from "@/lib/analytics";

const PANELS = {
  CHOICE: "choice",
  CREATE: "create",
  JOIN: "join",
};

const CREATE_STEPS = {
  NAME: "name",
  SETTINGS: "settings",
};

const JOIN_STEPS = {
  NAME: "name",
  LIST: "list",
};

const VISIBILITIES = {
  PUBLIC: "public",
  PRIVATE: "private",
};

const MAX_LOBBY_NAME_LENGTH = 28;
const MIN_LOBBY_NAME_LENGTH = 2;
const MIN_LOBBY_PASSWORD_LENGTH = 3;
const EXPANDED_REVEAL_DELAY = 320;

function responseData(response) {
  return response?.data || response || {};
}

function cleanLobbyName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_LOBBY_NAME_LENGTH);
}

function validateLobbyName(value, t) {
  const cleanName = cleanLobbyName(value);

  if (!cleanName) return t("setup.lobbyNameRequired");
  if (cleanName.length < MIN_LOBBY_NAME_LENGTH) {
    return `Use at least ${MIN_LOBBY_NAME_LENGTH} characters.`;
  }

  return "";
}

function cleanLobbyPassword(value) {
  return value.trim();
}

function validateLobbyPassword(value, t) {
  const cleanPassword = cleanLobbyPassword(value);

  if (!cleanPassword) return t("setup.lobbyPasswordRequired");
  if (cleanPassword.length < MIN_LOBBY_PASSWORD_LENGTH) {
    return `Use at least ${MIN_LOBBY_PASSWORD_LENGTH} characters.`;
  }

  return "";
}

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

function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
  type = "text",
  icon = null,
}) {
  return (
    <div className="relative block min-w-0">
      {icon && (
        <span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-white/34">
          {icon}
        </span>
      )}

      <input
        type={type}
        value={value}
        disabled={disabled}
        maxLength={MAX_LOBBY_NAME_LENGTH + 8}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={`card-control-frame card-action-height w-full appearance-none text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:ring-2 focus:ring-white/18 disabled:opacity-60 ${
          icon ? "px-12 pr-6" : "px-7"
        }`}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}

function VisibilitySwitch({ value, onChange, disabled = false }) {
  const { t } = useTranslation();
  const options = [
    {
      id: VISIBILITIES.PUBLIC,
      label: t("setup.publicLobby"),
      icon: Globe2,
    },
    {
      id: VISIBILITIES.PRIVATE,
      label: t("setup.privateLobby"),
      icon: Lock,
    },
  ];

  return (
    <div className="card-control-frame card-action-height grid grid-cols-2 overflow-hidden">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            title={option.label}
            onClick={() => onChange(option.id)}
            className={`grid min-w-0 place-items-center px-2 text-[0.72rem] font-bold uppercase tracking-normal transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60 ${
              isActive ? "bg-white text-zinc-950" : "text-white/72"
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Icon className="size-3.5 shrink-0" strokeWidth={2.25} />
              <span className="min-w-0 truncate">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function roomMatchesSearch(room, query) {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return true;

  return [
    room.code,
    room.name,
    room.hostName,
    room.gameMode,
    room.difficulty,
    room.visibility,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(cleanQuery);
}

function RoomListRow({ room, selected, onSelect, disabled }) {
  const { t } = useTranslation();
  const privacyLabel = room.isPrivate
    ? t("setup.privateLobby")
    : t("setup.publicLobby");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(room.code)}
      className={`flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-full px-4 text-left ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-48 ${
        selected
          ? "bg-white text-zinc-950 ring-white"
          : "bg-white/[0.055] text-white ring-white/12 hover:bg-white/10"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[0.86rem] font-semibold leading-none sm:text-[0.95rem]">
          {room.name || `#${room.code}`}
        </span>
        <span
          className={`mt-1 block truncate text-[0.62rem] font-bold uppercase leading-none tracking-normal ${
            selected ? "text-zinc-950/48" : "text-white/34"
          }`}
        >
          #{room.code} · {privacyLabel}
        </span>
      </span>

      <span
        className={`shrink-0 text-[0.72rem] font-bold leading-none ${
          selected ? "text-zinc-950/58" : "text-white/42"
        }`}
      >
        {room.playerCount}/{room.maxPlayers}
      </span>
    </button>
  );
}

export default function MultiplayerCard({ onTallStepChange }) {
  const router = useRouter();
  const { t } = useTranslation();
  const scopeRef = useRef(null);
  const [panel, setPanel] = useState(PANELS.CHOICE);
  const [createStep, setCreateStep] = useState(CREATE_STEPS.NAME);
  const [joinStep, setJoinStep] = useState(JOIN_STEPS.NAME);
  const [visibility, setVisibility] = useState(VISIBILITIES.PUBLIC);
  const [lobbyName, setLobbyName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [password, setPassword] = useState("");
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [joinPlayerName, setJoinPlayerName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const actionError = formError || submitError;
  const isCreateNameStep =
    panel === PANELS.CREATE && createStep === CREATE_STEPS.NAME;
  const isJoinNameStep = panel === PANELS.JOIN && joinStep === JOIN_STEPS.NAME;
  const isJoinListStep = panel === PANELS.JOIN && joinStep === JOIN_STEPS.LIST;
  const isPrivate = visibility === VISIBILITIES.PRIVATE;
  const description =
    panel === PANELS.CREATE
      ? t(
          isCreateNameStep
            ? "setup.createNameCopy"
            : isPrivate
              ? "setup.createPrivateCopy"
              : "setup.createPublicCopy",
        )
      : panel === PANELS.JOIN
        ? t(isJoinNameStep ? "setup.joinNameCopy" : "setup.joinListCopy")
      : t("setup.chooseMultiplayerAction");

  useScreenReveal(scopeRef, [panel, createStep, joinStep], {
    delay: isJoinListStep ? EXPANDED_REVEAL_DELAY : 0,
  });

  useEffect(() => {
    onTallStepChange?.(isJoinListStep);

    return () => onTallStepChange?.(false);
  }, [isJoinListStep, onTallStepChange]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.code === selectedRoomCode) || null,
    [rooms, selectedRoomCode],
  );

  const visibleRooms = useMemo(
    () => rooms.filter((room) => roomMatchesSearch(room, searchQuery)),
    [rooms, searchQuery],
  );

  const clearActionError = () => {
    if (formError) setFormError("");
    if (submitError) setSubmitError("");
  };

  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    const response = await emitWithAck("room:list");
    setIsLoadingRooms(false);

    if (!response.ok) {
      setSubmitError(response.error || t("room.couldNotReachServer"));
      return;
    }

    const nextRooms = responseData(response).rooms || [];
    setRooms(nextRooms);

    setSelectedRoomCode((currentCode) => {
      if (currentCode && nextRooms.some((room) => room.code === currentCode)) {
        return currentCode;
      }

      return nextRooms[0]?.code || "";
    });
  }, [t]);

  useEffect(() => {
    if (panel !== PANELS.JOIN || joinStep !== JOIN_STEPS.LIST) return undefined;

    const loadTimerId = window.setTimeout(() => {
      void loadRooms();
    }, 0);

    const socket = getSocket();
    if (!socket) {
      return () => window.clearTimeout(loadTimerId);
    }

    const handleListUpdated = (payload = {}) => {
      const nextRooms = payload.rooms || [];
      setRooms(nextRooms);
      setSelectedRoomCode((currentCode) => {
        if (currentCode && nextRooms.some((room) => room.code === currentCode)) {
          return currentCode;
        }

        return nextRooms[0]?.code || "";
      });
    };

    socket.on("room:listUpdated", handleListUpdated);

    return () => {
      window.clearTimeout(loadTimerId);
      socket.off("room:listUpdated", handleListUpdated);
    };
  }, [joinStep, loadRooms, panel]);

  useEffect(() => {
    if (!actionError) return undefined;

    const timeoutId = window.setTimeout(() => {
      setFormError("");
      setSubmitError("");
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [actionError]);

  const openPanel = (nextPanel) => {
    setPanel(nextPanel);
    if (nextPanel === PANELS.CREATE) {
      setCreateStep(CREATE_STEPS.NAME);
    }
    if (nextPanel === PANELS.JOIN) {
      setJoinStep(JOIN_STEPS.NAME);
    }
    setFormError("");
    setSubmitError("");
  };

  const handleConfirmCreateName = () => {
    const playerNameError = validatePlayerName(playerName, t);
    if (playerNameError) {
      setFormError(playerNameError);
      setSubmitError("");
      return;
    }

    setFormError("");
    setSubmitError("");
    setCreateStep(CREATE_STEPS.SETTINGS);
  };

  const handleConfirmJoinName = () => {
    const playerNameError = validatePlayerName(joinPlayerName, t);
    if (playerNameError) {
      setFormError(playerNameError);
      setSubmitError("");
      return;
    }

    setFormError("");
    setSubmitError("");
    setJoinStep(JOIN_STEPS.LIST);
  };

  const handleCreate = async () => {
    if (isCreating) return;

    const lobbyNameError = validateLobbyName(lobbyName, t);
    if (lobbyNameError) {
      setFormError(lobbyNameError);
      setSubmitError("");
      return;
    }

    const playerNameError = validatePlayerName(playerName, t);
    if (playerNameError) {
      setFormError(playerNameError);
      setSubmitError("");
      return;
    }

    if (isPrivate) {
      const passwordError = validateLobbyPassword(password, t);
      if (passwordError) {
        setFormError(passwordError);
        setSubmitError("");
        return;
      }
    }

    setFormError("");
    setSubmitError("");
    setIsCreating(true);

    const cleanName = cleanPlayerName(playerName);
    const playerId = createPlayerId();

    const response = await emitWithAck("room:create", {
      playerId,
      playerName: cleanName,
      roomName: cleanLobbyName(lobbyName),
      visibility,
      password: isPrivate ? cleanLobbyPassword(password) : "",
      difficulty: DEFAULT_DIFFICULTY_ID,
      gameMode: DEFAULT_GAME_MODE_ID,
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

    trackEvent("lobby_create", {
      game_type: "multiplayer",
      difficulty: DEFAULT_DIFFICULTY_ID,
      game_mode: DEFAULT_GAME_MODE_ID,
      visibility,
    });

    void copyInviteLink(response.room.code);
    router.push(`/${response.room.code}`);
  };

  const handleJoinSelectedRoom = async () => {
    if (isJoining) return;

    if (!selectedRoom) {
      setFormError(t("setup.chooseLobbyFirst"));
      setSubmitError("");
      return;
    }

    const playerNameError = validatePlayerName(joinPlayerName, t);
    if (playerNameError) {
      setFormError(playerNameError);
      setSubmitError("");
      return;
    }

    if (selectedRoom.hasPassword) {
      const passwordError = validateLobbyPassword(joinPassword, t);
      if (passwordError) {
        setFormError(passwordError);
        setSubmitError("");
        return;
      }
    }

    setFormError("");
    setSubmitError("");
    setIsJoining(true);

    const cleanName = cleanPlayerName(joinPlayerName);
    const playerId = createPlayerId();

    const response = await emitWithAck("room:join", {
      roomCode: selectedRoom.code,
      playerId,
      playerName: cleanName,
      password: selectedRoom.hasPassword ? cleanLobbyPassword(joinPassword) : "",
    });

    setIsJoining(false);

    if (!response.ok) {
      setSubmitError(response.error || t("room.couldNotJoin"));
      return;
    }

    saveRoomSession(selectedRoom.code, {
      playerId,
      playerName: cleanName,
      isHost: false,
    });

    trackEvent("lobby_join", {
      game_type: "multiplayer",
      difficulty: selectedRoom.difficulty,
      game_mode: selectedRoom.gameMode,
      visibility: selectedRoom.visibility,
    });

    router.push(`/${selectedRoom.code}`);
  };

  return (
    <div ref={scopeRef} className="home-view-panel flex h-full flex-col">
      <div data-screen-reveal className="home-view-copy max-w-[23rem] pr-10">
        <h1
          data-game-mode-shock-target
          className="text-[clamp(2.15rem,10.5vw,3.15rem)] font-semibold lowercase leading-[0.88] tracking-normal text-white sm:text-[4.05rem]"
        >
          {panel === PANELS.CREATE
            ? t("setup.createLobbyTitle")
            : panel === PANELS.JOIN
              ? t("room.joinLobby")
              : t("setup.multiplayer")}
        </h1>

        <p
          data-game-mode-shock-target
          className="mt-4 text-[0.92rem] font-medium leading-[1.22] text-white/82 sm:text-[0.98rem]"
        >
          {description}
        </p>
      </div>

      {panel === PANELS.CHOICE && (
        <div data-screen-reveal className="home-view-actions mt-auto w-full">
          <div className="grid w-full grid-cols-2 items-center gap-3">
            <button
              type="button"
              onClick={() => openPanel(PANELS.JOIN)}
              className="rgb-hover-button card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-center text-[0.95rem] font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-6 sm:text-base"
            >
              <LogIn className="relative z-10 size-5 shrink-0" strokeWidth={2.2} />
              <span className="relative z-10 min-w-0 truncate">
                {t("setup.joinLobbyAction")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openPanel(PANELS.CREATE)}
              className="rgb-hover-button card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-center text-[0.95rem] font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-6 sm:text-base"
            >
              <Plus className="relative z-10 size-5 shrink-0" strokeWidth={2.25} />
              <span className="relative z-10 min-w-0 truncate">
                {t("setup.createLobby")}
              </span>
            </button>
          </div>
        </div>
      )}

      {panel === PANELS.CREATE && (
        <>
          {createStep === CREATE_STEPS.NAME && (
            <div data-screen-reveal className="home-view-actions mt-auto w-full">
              <div className="grid w-full grid-cols-[1.06fr_0.94fr] items-center gap-2 sm:gap-3">
                <PlayerNameField
                  value={playerName}
                  onChange={(value) => {
                    setPlayerName(value);
                    clearActionError();
                  }}
                />

                <button
                  type="button"
                  onClick={handleConfirmCreateName}
                  className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-5 sm:text-base ${
                    actionError
                      ? "bg-red-500 text-white shadow-[0_16px_30px_rgba(239,68,68,0.22)]"
                      : "rgb-hover-button bg-white text-zinc-950"
                  }`}
                >
                  {actionError ? (
                    <X
                      className="relative z-10 shrink-0"
                      size={17}
                      strokeWidth={2.4}
                    />
                  ) : (
                    <ArrowRight
                      className="relative z-10 shrink-0"
                      size={18}
                      strokeWidth={2.35}
                    />
                  )}

                  <span className="relative z-10 min-w-0 truncate">
                    {actionError || t("setup.continueSetup")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {createStep === CREATE_STEPS.SETTINGS && (
            <>
              <div data-screen-reveal className="home-view-actions mt-auto w-full">
                <div className="grid w-full grid-cols-2 items-center gap-2 sm:gap-3">
                  <TextField
                    value={lobbyName}
                    onChange={(value) => {
                      setLobbyName(value);
                      clearActionError();
                    }}
                    disabled={isCreating}
                    ariaLabel={t("setup.lobbyNameAria")}
                    placeholder={t("setup.lobbyNamePlaceholder")}
                  />

                  <VisibilitySwitch
                    value={visibility}
                    onChange={(value) => {
                      setVisibility(value);
                      clearActionError();
                    }}
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div data-screen-reveal className="home-view-actions mt-3 w-full">
                <div
                  className={`grid w-full items-center gap-2 sm:gap-3 ${
                    isPrivate ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {isPrivate && (
                    <TextField
                      value={password}
                      onChange={(value) => {
                        setPassword(value);
                        clearActionError();
                      }}
                      disabled={isCreating}
                      type="password"
                      ariaLabel={t("setup.lobbyPasswordAria")}
                      placeholder={t("setup.lobbyPasswordPlaceholder")}
                    />
                  )}

                  <button
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

                    <span className="relative z-10 min-w-0 truncate">
                      {actionError ||
                        (isCreating
                          ? t("setup.creating")
                          : t("setup.createLobby"))}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {panel === PANELS.JOIN && (
        <>
          {joinStep === JOIN_STEPS.NAME && (
            <div data-screen-reveal className="home-view-actions mt-auto w-full">
              <div className="grid w-full grid-cols-[1.06fr_0.94fr] items-center gap-2 sm:gap-3">
                <PlayerNameField
                  value={joinPlayerName}
                  onChange={(value) => {
                    setJoinPlayerName(value);
                    clearActionError();
                  }}
                />

                <button
                  type="button"
                  onClick={handleConfirmJoinName}
                  className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-5 sm:text-base ${
                    actionError
                      ? "bg-red-500 text-white shadow-[0_16px_30px_rgba(239,68,68,0.22)]"
                      : "rgb-hover-button bg-white text-zinc-950"
                  }`}
                >
                  {actionError ? (
                    <X
                      className="relative z-10 shrink-0"
                      size={17}
                      strokeWidth={2.4}
                    />
                  ) : (
                    <ArrowRight
                      className="relative z-10 shrink-0"
                      size={18}
                      strokeWidth={2.35}
                    />
                  )}

                  <span className="relative z-10 min-w-0 truncate">
                    {actionError || t("setup.continueSetup")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {joinStep === JOIN_STEPS.LIST && (
            <>
              <div data-screen-reveal className="mt-4 w-full">
                <TextField
                  value={searchQuery}
                  onChange={setSearchQuery}
                  disabled={isJoining}
                  ariaLabel={t("setup.searchLobbyAria")}
                  placeholder={t("setup.searchLobbyPlaceholder")}
                  icon={<Search className="size-4" strokeWidth={2.3} />}
                />
              </div>

              <div data-screen-reveal className="scrollbar-hidden mt-4 min-h-0 flex-1 overflow-y-auto pr-0.5">
                {visibleRooms.length ? (
                  <div className="space-y-2">
                    {visibleRooms.map((room) => (
                      <RoomListRow
                        key={room.code}
                        room={room}
                        selected={room.code === selectedRoomCode}
                        disabled={isJoining || room.playerCount >= room.maxPlayers}
                        onSelect={(roomCode) => {
                          setSelectedRoomCode(roomCode);
                          setJoinPassword("");
                          clearActionError();
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[8.5rem] flex-col items-center justify-center px-6 text-center">
                    <Search
                      className="mb-3 size-7 text-white/18"
                      strokeWidth={1.85}
                      aria-hidden="true"
                    />
                    <p className="text-sm font-semibold text-white/38">
                      {isLoadingRooms ? t("common.loading") : t("setup.noLobbies")}
                    </p>
                    {!isLoadingRooms && (
                      <p className="mt-1 max-w-[13.5rem] text-xs font-medium leading-snug text-white/20">
                        {t("setup.noLobbiesHint")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div data-screen-reveal className="home-view-actions relative mt-auto w-full pt-4">
                <div
                  className={`grid w-full items-center gap-2 sm:gap-3 ${
                    selectedRoom?.hasPassword ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {selectedRoom?.hasPassword && (
                    <TextField
                      value={joinPassword}
                      onChange={(value) => {
                        setJoinPassword(value);
                        clearActionError();
                      }}
                      disabled={isJoining}
                      type="password"
                      ariaLabel={t("setup.lobbyPasswordAria")}
                      placeholder={t("setup.lobbyPasswordPlaceholder")}
                    />
                  )}

                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={handleJoinSelectedRoom}
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

                    <span className="relative z-10 min-w-0 truncate">
                      {actionError ||
                        (isJoining ? t("room.joining") : t("room.join"))}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
