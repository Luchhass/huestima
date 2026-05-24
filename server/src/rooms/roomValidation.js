import {
  DIFFICULTIES,
  GAME_MODES,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_MIN_LENGTH,
} from "../constants.js";

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

  return ok({ gameMode: cleanMode });
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

  if (![h, s, v].every(Number.isFinite)) return fail("Invalid color.");

  return ok({
    color: {
      h,
      s,
      v,
    },
  });
}
