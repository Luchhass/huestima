import {
  DIFFICULTIES,
  DEFAULT_ROUND_COUNT,
  GAME_FAMILIES,
  GAME_FAMILY_MODES,
  GAME_MODES,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_MIN_LENGTH,
  ROUND_COUNT_OPTIONS,
  ROOM_NAME_MAX_LENGTH,
  ROOM_NAME_MIN_LENGTH,
  ROOM_PASSWORD_MAX_LENGTH,
  ROOM_PASSWORD_MIN_LENGTH,
  ROOM_VISIBILITIES,
} from "../constants.js";
import { HAS_CARTOON_OPTIONS } from "../game/cartoons.js";

export function fail(error) {
  return { ok: false, error };
}

export function ok(data = {}) {
  return { ok: true, data };
}

export function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateRoomCode(roomCode) {
  const cleanCode = cleanString(roomCode);
  if (!/^\d{6}$/.test(cleanCode)) return fail("Room code must be exactly 6 digits.");
  return ok({ roomCode: cleanCode });
}

export function validatePlayerId(playerId) {
  const cleanId = cleanString(playerId);
  if (!cleanId || cleanId.length > 96) return fail("Invalid player session.");
  return ok({ playerId: cleanId });
}

export function validatePlayerName(playerName) {
  const cleanName = cleanString(playerName).replace(/\s+/g, " ");

  if (cleanName.length < PLAYER_NAME_MIN_LENGTH) {
    return fail(`Name must be at least ${PLAYER_NAME_MIN_LENGTH} characters.`);
  }

  if (cleanName.length > PLAYER_NAME_MAX_LENGTH) {
    return fail(`Name must be ${PLAYER_NAME_MAX_LENGTH} characters or fewer.`);
  }

  return ok({ playerName: cleanName });
}

export function validateDifficulty(difficulty) {
  const cleanDifficulty = cleanString(difficulty) || DIFFICULTIES.EASY;
  if (!Object.values(DIFFICULTIES).includes(cleanDifficulty)) {
    return fail("Invalid difficulty.");
  }

  return ok({ difficulty: cleanDifficulty });
}

export function validateGameMode(gameMode) {
  const cleanMode = cleanString(gameMode) || GAME_MODES.NORMAL;
  if (!Object.values(GAME_MODES).includes(cleanMode)) {
    return fail("Invalid game mode.");
  }

  if (cleanMode === GAME_MODES.CARTOON) {
    return fail("Memory mode is no longer available.");
  }

  return ok({ gameMode: cleanMode });
}

export function validateGameFamily(gameFamily) {
  const cleanFamily = cleanString(gameFamily) || GAME_FAMILIES.COLOR;
  if (!Object.values(GAME_FAMILIES).includes(cleanFamily)) {
    return fail("Invalid game family.");
  }

  if (cleanFamily === GAME_FAMILIES.CARTOON && !HAS_CARTOON_OPTIONS) {
    return fail("Cartoon game needs a cartoon dataset.");
  }

  return ok({ gameFamily: cleanFamily });
}

export function validateGameModeForFamily(gameMode, gameFamily) {
  const allowedModes = GAME_FAMILY_MODES[gameFamily];
  if (!allowedModes?.includes(gameMode)) {
    return fail("This game mode is not available for the selected game family.");
  }

  return ok({ gameMode, gameFamily });
}

export function validateRoundCount(roundCount) {
  const value = Number(roundCount ?? DEFAULT_ROUND_COUNT);

  if (!Number.isInteger(value) || !ROUND_COUNT_OPTIONS.includes(value)) {
    return fail("Invalid level count.");
  }

  return ok({ roundCount: value });
}

export function validateRoomName(roomName, fallback = "Huestima lobby") {
  const cleanName = (cleanString(roomName) || fallback).replace(/\s+/g, " ");

  if (cleanName.length < ROOM_NAME_MIN_LENGTH) {
    return fail(`Lobby name must be at least ${ROOM_NAME_MIN_LENGTH} characters.`);
  }

  if (cleanName.length > ROOM_NAME_MAX_LENGTH) {
    return fail(`Lobby name must be ${ROOM_NAME_MAX_LENGTH} characters or fewer.`);
  }

  return ok({ roomName: cleanName });
}

export function validateRoomVisibility(visibility) {
  const cleanVisibility = cleanString(visibility) || ROOM_VISIBILITIES.PUBLIC;

  if (!Object.values(ROOM_VISIBILITIES).includes(cleanVisibility)) {
    return fail("Invalid lobby visibility.");
  }

  return ok({ visibility: cleanVisibility });
}

export function validateRoomPassword(password, { required = false } = {}) {
  const cleanPassword = cleanString(password);

  if (!cleanPassword) {
    return required
      ? fail(`Password must be at least ${ROOM_PASSWORD_MIN_LENGTH} characters.`)
      : ok({ password: "" });
  }

  if (cleanPassword.length < ROOM_PASSWORD_MIN_LENGTH) {
    return fail(`Password must be at least ${ROOM_PASSWORD_MIN_LENGTH} characters.`);
  }

  if (cleanPassword.length > ROOM_PASSWORD_MAX_LENGTH) {
    return fail(`Password must be ${ROOM_PASSWORD_MAX_LENGTH} characters or fewer.`);
  }

  return ok({ password: cleanPassword });
}

export function validateRoundIndex(roundIndex, roundCount) {
  const value = Number(roundIndex);
  if (!Number.isInteger(value) || value < 0 || value >= roundCount) {
    return fail("Invalid round.");
  }

  return ok({ roundIndex: value });
}

export function validateHsvColor(color) {
  if (!color || typeof color !== "object") return fail("Invalid color.");

  const h = Number(color.h);
  const s = Number(color.s);
  const v = Number(color.v);

  if (
    ![h, s, v].every(Number.isFinite) ||
    h < 0 || h > 360 || s < 0 || s > 100 || v < 0 || v > 100
  ) {
    return fail("Invalid color.");
  }

  return ok({
    color: {
      h,
      s,
      v,
    },
  });
}
