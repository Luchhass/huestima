"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  Blend,
  ChevronDown,
  Eye,
  Flag,
  Infinity,
  Layers,
  Swords,
  Timer,
  Zap,
} from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_MODE_OPTIONS } from "@/lib/constants";
import { playGameModeSelect } from "@/lib/sound";

const GAME_MODE_ICONS = {
  normal: Eye,
  endless: Infinity,
  flash: Zap,
  sequence: Layers,
  timed: Timer,
  gradient: Blend,
  flag: Flag,
  duel: Swords,
};

const FALLBACK_ITEM_HEIGHT = 58;
const PANEL_EXTRA_HEIGHT = 82;
const PANEL_SHADOW =
  "0 22px 54px rgba(0,0,0,0.38), 0 8px 18px rgba(0,0,0,0.22)";
const PANEL_SHADOW_REST =
  "0 6px 14px rgba(0,0,0,0), 0 2px 6px rgba(0,0,0,0)";
const WHEEL_DELTA_THRESHOLD = 82;
const WHEEL_STEP_GUARD = 58;
const WHEEL_GESTURE_GAP = 180;
const MAX_WHEEL_STEPS_PER_EVENT = 3;
const DRAG_START_THRESHOLD = 5;
const DRAG_LOOP_THRESHOLD_RATIO = 0.5;

function wrapIndex(index, length) {
  if (length <= 0) return 0;

  return ((index % length) + length) % length;
}

function getSignedCircularDistance(index, centerIndex, length) {
  if (length <= 1) return index - centerIndex;

  let distance = index - centerIndex;
  const halfLength = length / 2;

  while (distance > halfLength) distance -= length;
  while (distance < -halfLength) distance += length;

  return distance;
}

function getCircularDistance(firstIndex, secondIndex, length) {
  return Math.abs(getSignedCircularDistance(firstIndex, secondIndex, length));
}

export default function GameModePicker({
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
  options = GAME_MODE_OPTIONS,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [renderOpen, setRenderOpen] = useState(false);
  const [wheelIndex, setWheelIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [itemHeight, setItemHeight] = useState(FALLBACK_ITEM_HEIGHT);
  const scopeRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const wheelAreaRef = useRef(null);
  const selectedValueRef = useRef(value);
  const wheelIndexRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const wheelStateRef = useRef({
    accumulator: 0,
    lastDirection: 0,
    lastEventAt: 0,
    lastStepAt: 0,
  });
  const dragStateRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    lastY: 0,
    startY: 0,
  });

  const selectedIndex = Math.max(
    options.findIndex((option) => option.id === value),
    0,
  );
  const selectedOption = options[selectedIndex] || options[0];
  const SelectedIcon = GAME_MODE_ICONS[selectedOption?.id] || Eye;
  const selectedLabel = selectedOption
    ? t(`gameMode.${selectedOption.id}`)
    : t("gameMode.label");
  const optionCount = options.length;
  const panelHeight = itemHeight + PANEL_EXTRA_HEIGHT;

  const commitMode = useCallback(
    (optionId, optionIndex) => {
      if (disabled) return;
      if (optionId === selectedValueRef.current) return;

      selectedValueRef.current = optionId;
      playGameModeSelect(optionId, optionIndex);
      onChange(optionId);
    },
    [disabled, onChange],
  );

  const moveToIndex = useCallback(
    (nextIndex, { commit = true } = {}) => {
      if (!optionCount) return;

      const wrappedIndex = wrapIndex(nextIndex, optionCount);
      const option = options[wrappedIndex];
      if (!option) return;

      wheelIndexRef.current = wrappedIndex;
      dragOffsetRef.current = 0;
      setWheelIndex(wrappedIndex);
      setDragOffset(0);

      if (commit) {
        commitMode(option.id, wrappedIndex);
      }
    },
    [commitMode, optionCount, options],
  );

  const stepWheel = useCallback(
    (direction) => {
      if (optionCount < 2) return;

      moveToIndex(wheelIndexRef.current + direction);
    },
    [moveToIndex, optionCount],
  );

  const moveWheelPreview = useCallback(
    (nextIndex, nextOffset) => {
      if (!optionCount) return;

      const wrappedIndex = wrapIndex(nextIndex, optionCount);

      wheelIndexRef.current = wrappedIndex;
      dragOffsetRef.current = nextOffset;
      setWheelIndex(wrappedIndex);
      setDragOffset(nextOffset);
    },
    [optionCount],
  );

  const closePicker = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    selectedValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!scopeRef.current?.contains(event.target)) {
        closePicker();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closePicker();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [closePicker, open]);

  useLayoutEffect(() => {
    if (!renderOpen) return undefined;

    const panel = panelRef.current;
    if (!panel) return undefined;

    gsap.killTweensOf(panel);

    if (open) {
      gsap.fromTo(
        panel,
        {
          height: itemHeight,
          autoAlpha: 1,
          boxShadow: PANEL_SHADOW_REST,
          yPercent: -50,
        },
        {
          height: panelHeight,
          autoAlpha: 1,
          boxShadow: PANEL_SHADOW,
          duration: 0.34,
          ease: "expo.out",
          overwrite: true,
        },
      );
    } else {
      gsap.fromTo(
        panel,
        {
          height: panel.getBoundingClientRect().height || panelHeight,
          autoAlpha: 1,
          boxShadow: PANEL_SHADOW,
          yPercent: -50,
        },
        {
          height: itemHeight,
          autoAlpha: 1,
          boxShadow: PANEL_SHADOW_REST,
          duration: 0.22,
          ease: "power3.inOut",
          overwrite: true,
          onComplete: () => {
            setRenderOpen(false);
          },
        },
      );
    }

    return () => {
      gsap.killTweensOf(panel);
    };
  }, [itemHeight, open, panelHeight, renderOpen]);

  const handleTriggerClick = () => {
    if (disabled) return;

    if (open) {
      closePicker();
      return;
    }

    const nextHeight =
      triggerRef.current?.getBoundingClientRect().height || FALLBACK_ITEM_HEIGHT;

    setItemHeight(nextHeight);
    wheelIndexRef.current = selectedIndex;
    dragOffsetRef.current = 0;
    setWheelIndex(selectedIndex);
    setDragOffset(0);
    setRenderOpen(true);
    setOpen(true);
  };

  const handleWheel = (event) => {
    if (disabled || optionCount < 2) return;

    event.preventDefault();
    event.stopPropagation();

    const normalizedDelta =
      event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * window.innerHeight
          : event.deltaY;
    const direction = Math.sign(normalizedDelta);
    if (direction === 0) return;

    const now = event.timeStamp;
    const wheelState = wheelStateRef.current;

    if (
      direction !== wheelState.lastDirection ||
      now - wheelState.lastEventAt > WHEEL_GESTURE_GAP
    ) {
      wheelState.accumulator = 0;
      wheelState.lastDirection = direction;
    }

    wheelState.lastEventAt = now;
    wheelState.accumulator += normalizedDelta;

    if (Math.abs(wheelState.accumulator) < WHEEL_DELTA_THRESHOLD) return;

    if (now - wheelState.lastStepAt < WHEEL_STEP_GUARD) {
      wheelState.accumulator = 0;
      return;
    }

    let steps = 0;
    while (
      Math.abs(wheelState.accumulator) >= WHEEL_DELTA_THRESHOLD &&
      steps < MAX_WHEEL_STEPS_PER_EVENT
    ) {
      stepWheel(direction);
      wheelState.accumulator -= direction * WHEEL_DELTA_THRESHOLD;
      wheelState.lastStepAt = now;
      steps += 1;
    }
  };

  const handleWheelPointerDown = (event) => {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      lastY: event.clientY,
      startY: event.clientY,
    };
    dragOffsetRef.current = 0;
    setDragging(true);
    setDragOffset(0);

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleOptionClick = (optionId, optionIndex) => {
    if (disabled) return;

    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }

    if (optionIndex === wheelIndexRef.current) {
      closePicker();
      return;
    }

    moveToIndex(optionIndex, { commit: false });
    commitMode(optionId, optionIndex);
  };

  useEffect(() => {
    if (!dragging) return undefined;

    const handleWindowPointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.active) return;
      if (
        dragState.pointerId !== null &&
        event.pointerId !== dragState.pointerId
      ) {
        return;
      }

      event.preventDefault();

      const deltaY = event.clientY - dragState.lastY;
      let nextIndex = wheelIndexRef.current;
      let nextOffset = dragOffsetRef.current + deltaY;
      const loopThreshold = itemHeight * DRAG_LOOP_THRESHOLD_RATIO;

      if (Math.abs(event.clientY - dragState.startY) > DRAG_START_THRESHOLD) {
        dragState.moved = true;
      }

      while (nextOffset > loopThreshold) {
        nextIndex -= 1;
        nextOffset -= itemHeight;
      }

      while (nextOffset < -loopThreshold) {
        nextIndex += 1;
        nextOffset += itemHeight;
      }

      dragState.lastY = event.clientY;
      moveWheelPreview(nextIndex, nextOffset);
    };

    const handleWindowPointerEnd = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.active) return;
      if (
        dragState.pointerId !== null &&
        event.pointerId !== dragState.pointerId
      ) {
        return;
      }

      const captureTarget = wheelAreaRef.current;
      const finalIndex = wheelIndexRef.current;

      dragStateRef.current = {
        active: false,
        moved: dragState.moved,
        pointerId: null,
        lastY: 0,
        startY: 0,
      };

      setDragging(false);
      moveToIndex(finalIndex);

      if (
        dragState.pointerId !== null &&
        captureTarget?.hasPointerCapture?.(dragState.pointerId)
      ) {
        captureTarget.releasePointerCapture(dragState.pointerId);
      }

      window.setTimeout(() => {
        dragStateRef.current.moved = false;
      }, 0);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [dragging, itemHeight, moveToIndex, moveWheelPreview]);

  return (
    <div
      ref={scopeRef}
      data-open={open ? "true" : "false"}
      className={`game-mode-picker relative h-[58px] min-w-0 sm:h-[62px] ${
        open || renderOpen ? "z-[180]" : "z-0"
      } ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel || t("gameMode.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-game-mode-index={selectedIndex}
        disabled={disabled}
        onClick={handleTriggerClick}
        className={`card-control-frame card-action-height group flex w-full min-w-0 items-center gap-2 overflow-hidden p-1 pr-2 text-left text-white transition hover:bg-white/[0.035] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-default disabled:opacity-60 sm:gap-3.5 sm:pr-4 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <span className="grid h-full aspect-square shrink-0 place-items-center rounded-full bg-white text-zinc-950 shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
          <SelectedIcon className="size-5" strokeWidth={2.15} />
        </span>

        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="block text-[0.48rem] font-bold uppercase leading-[0.92] tracking-[0.1em] text-white/42 sm:text-[0.56rem] sm:leading-none sm:tracking-[0.16em]">
            {t("gameMode.label")}
          </span>
          <span className="mt-1 block truncate text-[0.9rem] font-semibold leading-none text-white sm:mt-1.5 sm:text-base">
            {selectedLabel}
          </span>
        </span>

        <ChevronDown
          className="hidden size-4.5 shrink-0 text-white/62 transition-transform duration-300 sm:block"
          strokeWidth={2.2}
        />
      </button>

      {renderOpen && (
        <div
          ref={panelRef}
          className="game-mode-picker__panel absolute left-0 top-1/2 z-[220] w-full overflow-hidden rounded-[29px] border-2 border-white/96 bg-black text-white"
          style={{ height: itemHeight, boxShadow: PANEL_SHADOW_REST }}
          role="listbox"
          aria-label={ariaLabel || t("gameMode.label")}
        >
          <div
            ref={wheelAreaRef}
            onWheel={handleWheel}
            onPointerDown={handleWheelPointerDown}
            className={`relative h-full cursor-grab overflow-hidden px-1 select-none touch-none active:cursor-grabbing ${
              dragging ? "game-mode-picker__wheel--dragging" : ""
            }`}
          >
            {options.map((option, optionIndex) => {
              const active = wheelIndex === optionIndex;
              const signedDistance = getSignedCircularDistance(
                optionIndex,
                wheelIndex,
                optionCount,
              );
              const visualDistance = Math.abs(
                signedDistance + dragOffset / itemHeight,
              );
              const distance = getCircularDistance(
                wheelIndex,
                optionIndex,
                optionCount,
              );
              const Icon = GAME_MODE_ICONS[option.id] || Eye;
              const label = t(`gameMode.${option.id}`);
              const y = signedDistance * itemHeight + dragOffset;
              const scale = active
                ? 1
                : visualDistance < 1.4
                  ? 0.94
                  : 0.88;
              const opacity = active
                ? 1
                : visualDistance < 1.4
                  ? 0.72
                  : visualDistance < 2.4
                    ? 0.36
                    : 0;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-game-mode-index={optionIndex}
                  onClick={() => handleOptionClick(option.id, optionIndex)}
                  className={`absolute -left-0.5 -right-0.5 top-1/2 z-10 flex h-[58px] items-center gap-2 rounded-full border-2 border-transparent p-1 pr-2 text-left will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-[62px] sm:gap-3.5 sm:pr-4 ${
                    dragging
                      ? ""
                      : "transition-[opacity,transform,color] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  } ${
                    active
                      ? "text-white"
                      : distance === 1
                        ? "text-white/62"
                        : "text-white/36"
                  }`}
                  style={{
                    opacity,
                    transform: `translate3d(0, calc(-50% + ${y}px), 0) scale(${scale})`,
                    zIndex: active ? 18 : Math.max(1, 12 - Math.round(visualDistance)),
                  }}
                >
                  <span
                    className={`grid h-full aspect-square shrink-0 place-items-center rounded-full transition-colors duration-300 ${
                      active
                        ? "bg-white text-zinc-950 shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
                        : "bg-transparent text-white/72"
                    }`}
                  >
                    <Icon className="size-4.5" strokeWidth={2.15} />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col justify-center">
                    <span
                      className={`block text-[0.48rem] font-bold uppercase leading-[0.92] tracking-[0.1em] sm:text-[0.56rem] sm:leading-none sm:tracking-[0.16em] ${
                        active ? "text-white/42" : "text-white/32"
                      }`}
                    >
                      {t("gameMode.label")}
                    </span>
                    <span
                      className={`block truncate font-semibold leading-none ${
                        active
                          ? "mt-1 text-[0.9rem] text-white sm:mt-1.5 sm:text-base"
                          : "mt-1.5 text-[0.86rem] text-white/72 sm:text-[0.95rem]"
                      }`}
                    >
                      {label}
                    </span>
                  </span>

                  <ChevronDown
                    className={`hidden size-4.5 shrink-0 rotate-180 text-white/62 transition-opacity duration-200 sm:block ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                    strokeWidth={2.2}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
