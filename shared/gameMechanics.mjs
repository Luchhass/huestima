export function shouldMemorizeMultiplayerRound(gameMode, gameFamily) {
  return gameFamily === "color" && gameMode !== "spot";
}

export function isFixedMultiplayerRoundMode(gameMode) {
  return gameMode === "sprint" || gameMode === "duel";
}
