"use client";

import { useEffect } from "react";
import {
  playCloseClick,
  playCloseHover,
  playButtonClick,
  playButtonHover,
  playDifficultyHover,
  playGameModeHover,
  prepareAudio,
  resumeAudioIfAllowed,
  startRgbHoverDrive,
  unlockAudio,
} from "@/lib/sound";

const INTERACTIVE_SELECTOR = "button, a[href], [role='button']";

function getInteractiveElement(event) {
  if (!(event.target instanceof Element)) return null;
  if (event.target.closest("[data-sound='off']")) return null;

  const element = event.target.closest(INTERACTIVE_SELECTOR);
  if (!element) return null;
  if (element.getAttribute("aria-disabled") === "true") return null;
  if ("disabled" in element && element.disabled) return null;

  return element;
}

function getSoundKind(element) {
  if (element.closest(".solo-close-button")) return "close";
  if (element.closest(".difficulty-switch")) return "difficulty";
  if (element.closest(".game-mode-switch")) return "game-mode";
  return "default";
}

function getDifficultyIndex(element) {
  const switchElement = element.closest(".difficulty-switch");
  if (!switchElement) return 0;

  const buttons = Array.from(switchElement.querySelectorAll("button"));
  return Math.max(0, buttons.indexOf(element));
}

function getGameModeIndex(element) {
  const switchElement = element.closest(".game-mode-switch");
  if (!switchElement) return 0;

  const buttons = Array.from(switchElement.querySelectorAll("button"));
  return Math.max(0, buttons.indexOf(element));
}

export default function InteractionAudio() {
  useEffect(() => {
    const hoverDriveStops = new Map();
    prepareAudio();

    const stopHoverDrive = (element) => {
      const stop = hoverDriveStops.get(element);
      if (!stop) return;

      stop();
      hoverDriveStops.delete(element);
    };

    const stopAllHoverDrives = () => {
      hoverDriveStops.forEach((stop) => stop());
      hoverDriveStops.clear();
    };

    const handlePointerOver = (event) => {
      const element = getInteractiveElement(event);
      if (!element) return;
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;

      const soundKind = getSoundKind(element);

      if (soundKind === "close") {
        playCloseHover();
        return;
      }

      if (soundKind === "difficulty") {
        playDifficultyHover(getDifficultyIndex(element));
        return;
      }

      if (soundKind === "game-mode") {
        playGameModeHover(getGameModeIndex(element));
        return;
      }

      playButtonHover();

      if (element.classList.contains("rgb-hover-button")) {
        stopHoverDrive(element);
        const stopDrive = startRgbHoverDrive();
        hoverDriveStops.set(element, stopDrive);
      }
    };

    const handlePointerOut = (event) => {
      const element = getInteractiveElement(event);
      if (!element) return;
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;

      stopHoverDrive(element);
    };

    const handlePointerDown = (event) => {
      unlockAudio();

      const element = getInteractiveElement(event);
      if (!element) return;
      stopHoverDrive(element);

      const soundKind = getSoundKind(element);
      if (soundKind === "difficulty" || soundKind === "game-mode") return;

      if (soundKind === "close") {
        playCloseClick();
        return;
      }

      playButtonClick();
    };

    const handleKeyDown = (event) => {
      unlockAudio();

      if (event.key !== "Enter" && event.key !== " ") return;

      const element = getInteractiveElement(event);
      if (!element) return;
      stopHoverDrive(element);

      const soundKind = getSoundKind(element);
      if (soundKind === "difficulty" || soundKind === "game-mode") return;

      if (soundKind === "close") {
        playCloseClick();
        return;
      }

      playButtonClick();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopAllHoverDrives();
        return;
      }

      if (document.visibilityState === "visible") {
        resumeAudioIfAllowed();
      }
    };

    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointerout", handlePointerOut, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("pointerdown", unlockAudio, true);
    window.addEventListener("mousedown", unlockAudio, true);
    window.addEventListener("touchstart", unlockAudio, { capture: true, passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", resumeAudioIfAllowed);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver, true);
      document.removeEventListener("pointerout", handlePointerOut, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("mousedown", unlockAudio, true);
      window.removeEventListener("touchstart", unlockAudio, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", resumeAudioIfAllowed);
      stopAllHoverDrives();
    };
  }, []);

  return null;
}
