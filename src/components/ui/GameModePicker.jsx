"use client";

import { useEffect, useRef, useState } from "react";
import {
  Blend,
  ChevronDown,
  Eye,
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
  duel: Swords,
};

const WHEEL_COMMIT_DELAY = 140;
const WHEEL_DELTA_THRESHOLD = 90;
const WHEEL_GESTURE_GAP = 180;
const WHEEL_STEP_GUARD = 115;
const DRAG_START_THRESHOLD = 5;
const WHEEL_COPY_COUNT = 3;
const WHEEL_CENTER_COPY = 1;

function wrapIndex(index, length) {
  if (length <= 0) return 0;

  return ((index % length) + length) % length;
}

function getCircularDistance(firstIndex, secondIndex, length) {
  if (length <= 1) return Math.abs(firstIndex - secondIndex);

  const directDistance = Math.abs(firstIndex - secondIndex);
  return Math.min(directDistance, length - directDistance);
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
  const [wheelIndex, setWheelIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const scopeRef = useRef(null);
  const wheelRef = useRef(null);
  const optionRefs = useRef([]);
  const wheelCommitTimerRef = useRef(null);
  const wheelRecenterTimerRef = useRef(null);
  const wheelHandlerRef = useRef(null);
  const selectedValueRef = useRef(value);
  const wheelIndexRef = useRef(0);
  const wheelStateRef = useRef({
    accumulator: 0,
    lastDirection: 0,
    lastEventAt: 0,
    lastStepAt: 0,
  });
  const dragStateRef = useRef({
    active: false,
    lastY: 0,
    startY: 0,
    pointerId: null,
  });
  const dragStartedRef = useRef(false);

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
  const loopWheel = optionCount > 1;
  const wheelItems = loopWheel
    ? Array.from({ length: optionCount * WHEEL_COPY_COUNT }, (_, renderIndex) => {
        const optionIndex = renderIndex % optionCount;

        return {
          option: options[optionIndex],
          optionIndex,
          renderIndex,
        };
      })
    : options.map((option, optionIndex) => ({
        option,
        optionIndex,
        renderIndex: optionIndex,
      }));

  const getLoopRenderIndex = (optionIndex) =>
    loopWheel ? optionCount * WHEEL_CENTER_COPY + optionIndex : optionIndex;

  useEffect(() => {
    selectedValueRef.current = value;
  }, [value]);

  useEffect(() => {
    wheelIndexRef.current = wheelIndex;
  }, [wheelIndex]);

  useEffect(() => {
    return () => {
      window.clearTimeout(wheelCommitTimerRef.current);
      window.clearTimeout(wheelRecenterTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!scopeRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const renderIndex = loopWheel
        ? optionCount * WHEEL_CENTER_COPY + selectedIndex
        : selectedIndex;

      optionRefs.current[renderIndex]?.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loopWheel, open, optionCount, selectedIndex]);

  const commitMode = (optionId, optionIndex) => {
    if (disabled) return;

    if (optionId === selectedValueRef.current) return;

    selectedValueRef.current = optionId;
    playGameModeSelect(optionId, optionIndex);
    onChange(optionId);
  };

  const getNearestWheelRenderIndex = () => {
    const wheelElement = wheelRef.current;
    if (!wheelElement) return selectedIndex;

    const wheelBounds = wheelElement.getBoundingClientRect();
    const wheelCenter = wheelBounds.top + wheelBounds.height / 2;

    return optionRefs.current.reduce((nearestIndex, optionElement, renderIndex) => {
        if (!optionElement) return nearestIndex;

        const optionBounds = optionElement.getBoundingClientRect();
        const optionCenter = optionBounds.top + optionBounds.height / 2;
        const nearestElement = optionRefs.current[nearestIndex];

        if (!nearestElement) return renderIndex;

        const nearestBounds = nearestElement.getBoundingClientRect();
        const nearestCenter = nearestBounds.top + nearestBounds.height / 2;

        return Math.abs(optionCenter - wheelCenter) <
          Math.abs(nearestCenter - wheelCenter)
          ? renderIndex
          : nearestIndex;
      }, getLoopRenderIndex(selectedIndex));
  };

  const getNearestWheelIndex = () => {
    return wrapIndex(getNearestWheelRenderIndex(), optionCount);
  };

  const scheduleWheelCommit = (optionIndex) => {
    window.clearTimeout(wheelCommitTimerRef.current);

    wheelCommitTimerRef.current = window.setTimeout(() => {
      const option = options[optionIndex];
      if (!option) return;

      commitMode(option.id, optionIndex);
    }, WHEEL_COMMIT_DELAY);
  };

  const scrollRenderOptionIntoView = (renderIndex, behavior = "smooth") => {
    const wheelElement = wheelRef.current;
    const optionElement = optionRefs.current[renderIndex];
    if (!wheelElement || !optionElement) return;

    const targetScrollTop =
      optionElement.offsetTop -
      (wheelElement.clientHeight - optionElement.offsetHeight) / 2;

    wheelElement.scrollTo({
      top: targetScrollTop,
      behavior,
    });
  };

  const scrollOptionIntoView = (optionIndex, behavior = "smooth") => {
    scrollRenderOptionIntoView(getLoopRenderIndex(optionIndex), behavior);
  };

  const scheduleWheelRecenter = (optionIndex, delay = 340) => {
    if (!loopWheel) return;

    window.clearTimeout(wheelRecenterTimerRef.current);
    wheelRecenterTimerRef.current = window.setTimeout(() => {
      scrollOptionIntoView(optionIndex, "auto");
    }, delay);
  };

  const selectWheelIndex = (optionIndex, behavior = "smooth") => {
    const nextIndex = loopWheel
      ? wrapIndex(optionIndex, optionCount)
      : Math.min(Math.max(optionIndex, 0), options.length - 1);
    const option = options[nextIndex];
    if (!option) return;

    wheelIndexRef.current = nextIndex;
    setWheelIndex(nextIndex);
    scrollOptionIntoView(nextIndex, behavior);
    commitMode(option.id, nextIndex);
  };

  const handleWheelScroll = () => {
    const nextIndex = getNearestWheelIndex();

    wheelIndexRef.current = nextIndex;
    setWheelIndex(nextIndex);

    if (dragStateRef.current.active) return;

    scheduleWheelCommit(nextIndex);
  };

  const handleWheel = (event) => {
    if (disabled) return;

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
    if (now - wheelState.lastStepAt < WHEEL_STEP_GUARD) return;

    const currentRenderIndex = getNearestWheelRenderIndex();
    let nextRenderIndex = currentRenderIndex + direction;

    wheelState.accumulator = 0;
    wheelState.lastStepAt = now;

    if (!loopWheel && (nextRenderIndex < 0 || nextRenderIndex >= optionCount)) {
      return;
    }

    if (loopWheel && (nextRenderIndex < 0 || nextRenderIndex >= wheelItems.length)) {
      const centeredRenderIndex = getLoopRenderIndex(
        wrapIndex(currentRenderIndex, optionCount),
      );

      scrollRenderOptionIntoView(centeredRenderIndex, "auto");
      nextRenderIndex = centeredRenderIndex + direction;
    }

    window.clearTimeout(wheelCommitTimerRef.current);
    scrollRenderOptionIntoView(nextRenderIndex, "smooth");
    scheduleWheelRecenter(wrapIndex(nextRenderIndex, optionCount));
  };

  useEffect(() => {
    wheelHandlerRef.current = handleWheel;
  });

  useEffect(() => {
    if (!open) return undefined;

    const wheelElement = wheelRef.current;
    if (!wheelElement) return undefined;

    const handleNativeWheel = (event) => {
      wheelHandlerRef.current?.(event);
    };

    wheelElement.addEventListener("wheel", handleNativeWheel, {
      passive: false,
    });

    return () => {
      wheelElement.removeEventListener("wheel", handleNativeWheel);
    };
  }, [open]);

  const handleWheelPointerDown = (event) => {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();

    dragStartedRef.current = false;
    dragStateRef.current = {
      active: true,
      lastY: event.clientY,
      startY: event.clientY,
      pointerId: event.pointerId,
    };
    setDragging(true);

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleWheelPointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState.active) return;

    event.preventDefault();

    const deltaY = dragState.lastY - event.clientY;
    const totalDelta = Math.abs(event.clientY - dragState.startY);

    if (totalDelta > DRAG_START_THRESHOLD) {
      dragStartedRef.current = true;
    }

    if (wheelRef.current) {
      wheelRef.current.scrollTop += deltaY;
    }

    dragState.lastY = event.clientY;
  };

  const handleWheelPointerEnd = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState.active) return;

    dragStateRef.current = {
      active: false,
      lastY: 0,
      startY: 0,
      pointerId: null,
    };
    setDragging(false);

    if (
      dragState.pointerId !== null &&
      event.currentTarget.hasPointerCapture?.(dragState.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);
    }

    const nextRenderIndex = getNearestWheelRenderIndex();
    const nextIndex = wrapIndex(nextRenderIndex, optionCount);
    wheelIndexRef.current = nextIndex;
    setWheelIndex(nextIndex);
    scheduleWheelCommit(nextIndex);
    scrollRenderOptionIntoView(nextRenderIndex);

    scheduleWheelRecenter(nextIndex, 320);

    window.setTimeout(() => {
      dragStartedRef.current = false;
    }, 0);
  };

  const handleOptionClick = (optionId, optionIndex, renderIndex) => {
    if (disabled) return;

    if (dragStartedRef.current) {
      dragStartedRef.current = false;
      return;
    }

    window.clearTimeout(wheelCommitTimerRef.current);

    wheelIndexRef.current = optionIndex;
    setWheelIndex(optionIndex);
    scrollRenderOptionIntoView(renderIndex);
    commitMode(optionId, optionIndex);

    if (optionIndex === wheelIndex) {
      setOpen(false);
    }
  };

  const handleTriggerClick = () => {
    if (disabled) return;

    const nextOpen = !open;
    if (nextOpen) {
      wheelIndexRef.current = selectedIndex;
      setWheelIndex(selectedIndex);
    }
    setOpen(nextOpen);
  };

  return (
    <div
      ref={scopeRef}
      data-open={open ? "true" : "false"}
      className={`game-mode-picker relative h-[58px] min-w-0 ${
        open ? "z-[70]" : "z-0"
      } ${className}`}
    >
      <button
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
          className={`hidden size-4.5 shrink-0 text-white/62 transition-transform duration-300 sm:block ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>

      {open && (
        <div
          className="game-mode-picker__panel absolute left-0 top-1/2 z-[90] h-[8.75rem] w-full overflow-hidden rounded-[29px] border-2 border-white/96 bg-black text-white shadow-[0_22px_54px_rgba(0,0,0,0.36),0_8px_18px_rgba(0,0,0,0.2)]"
          role="listbox"
          aria-label={ariaLabel || t("gameMode.label")}
        >
          <button
            type="button"
            aria-label="Close game mode picker"
            data-game-mode-index={wheelIndex}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 z-30 hidden size-9 -translate-y-1/2 place-items-center rounded-full text-white/66 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:grid"
          >
            <ChevronDown
              className="size-4.5 rotate-180"
              strokeWidth={2.2}
            />
          </button>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-7 bg-gradient-to-b from-black/90 via-black/42 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-7 bg-gradient-to-t from-black/90 via-black/42 to-transparent" />

          <div
            ref={wheelRef}
            onScroll={handleWheelScroll}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerEnd}
            onPointerCancel={handleWheelPointerEnd}
            onLostPointerCapture={handleWheelPointerEnd}
            className={`scrollbar-hidden relative h-full cursor-grab overflow-y-auto px-1 py-[2.5625rem] select-none touch-none active:cursor-grabbing ${
              dragging ? "snap-none" : "snap-y snap-mandatory"
            }`}
          >
            {wheelItems.map(({ option, optionIndex, renderIndex }) => {
              const active = wheelIndex === optionIndex;
              const distance = getCircularDistance(
                wheelIndex,
                optionIndex,
                optionCount,
              );
              const Icon = GAME_MODE_ICONS[option.id] || Eye;
              const label = t(`gameMode.${option.id}`);

              return (
                <button
                  key={`${option.id}-${renderIndex}`}
                  ref={(element) => {
                    optionRefs.current[renderIndex] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-game-mode-index={optionIndex}
                  onClick={() =>
                    handleOptionClick(option.id, optionIndex, renderIndex)
                  }
                  className={`relative z-10 flex h-[58px] w-full snap-center items-center gap-3 rounded-full p-1 text-left transition-[opacity,transform,color] duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:gap-3.5 sm:pr-10 ${
                    active
                      ? "scale-100 text-white opacity-100"
                      : distance === 1
                        ? "scale-[0.94] text-white/62 opacity-86"
                        : "scale-[0.88] text-white/36 opacity-52"
                  }`}
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
                      className={`mt-1.5 block truncate font-semibold leading-none ${
                        active
                          ? "text-[0.9rem] text-white sm:text-base"
                          : "text-[0.86rem] text-white/72 sm:text-[0.95rem]"
                      }`}
                    >
                      {label}
                    </span>
                  </span>

                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
