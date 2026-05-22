import {
  DEFAULT_DIFFICULTY_ID,
  DIFFICULTY_OPTIONS,
} from "./constants";

export function getDifficultyOption(id) {
  return (
    DIFFICULTY_OPTIONS.find((option) => option.id === id) ||
    DIFFICULTY_OPTIONS.find((option) => option.id === DEFAULT_DIFFICULTY_ID)
  );
}

export function hasDifficultyControl(difficulty, control) {
  return difficulty.controls.includes(control);
}

export function applyDifficultyConstraints(hsv, difficulty) {
  return {
    ...hsv,
    ...difficulty.fixed,
  };
}
