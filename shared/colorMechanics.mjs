export function difficultyControls(difficulty) {
  return Array.isArray(difficulty?.controls) ? difficulty.controls : [];
}

export function finiteColorChannel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function resolveChannelValue({
  difficulty,
  channel,
  targetValue,
  guessValue,
  fallbackValue = 0,
}) {
  const target = finiteColorChannel(targetValue);
  const guess = finiteColorChannel(guessValue);

  if (!difficultyControls(difficulty).includes(channel)) {
    return target ?? fallbackValue;
  }

  return guess ?? target ?? fallbackValue;
}

export function resolveGuessChannels({ guess, target, difficulty, fallback = {} }) {
  return {
    h: resolveChannelValue({
      difficulty,
      channel: "h",
      targetValue: target?.h,
      guessValue: guess?.h,
      fallbackValue: fallback.h ?? 0,
    }),
    s: resolveChannelValue({
      difficulty,
      channel: "s",
      targetValue: target?.s,
      guessValue: guess?.s,
      fallbackValue: fallback.s ?? 0,
    }),
    v: resolveChannelValue({
      difficulty,
      channel: "v",
      targetValue: target?.v,
      guessValue: guess?.v,
      fallbackValue: fallback.v ?? 0,
    }),
  };
}
