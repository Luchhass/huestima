"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { DEFAULT_ROUND_COUNT, ROUND_COUNT_OPTIONS } from "@/lib/constants";
import { normalizeRoundCount } from "@/lib/roundCount";

const WHEEL_DELTA_THRESHOLD = 80;
const WHEEL_STEP_GUARD = 56;
const WHEEL_GESTURE_GAP = 180;
const MAX_WHEEL_STEPS_PER_EVENT = 3;
const DRAG_START_THRESHOLD = 5;
const DRAG_LOOP_THRESHOLD_RATIO = 0.5;
const FALLBACK_ITEM_WIDTH = 46;
const COPY_COUNT = 3;

function mod(value, length) {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
}

export default function LevelCountPicker({
  value = DEFAULT_ROUND_COUNT,
  onChange,
  disabled = false,
  className = "",
}) {
  const { t } = useTranslation();
  const optionCount = ROUND_COUNT_OPTIONS.length;
  const selectedRoundCount = normalizeRoundCount(value);
  const selectedIndex = Math.max(
    ROUND_COUNT_OPTIONS.findIndex((option) => option === selectedRoundCount),
    0,
  );

  const [virtualIndex, setVirtualIndex] = useState(optionCount + selectedIndex);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [itemWidth, setItemWidth] = useState(FALLBACK_ITEM_WIDTH);

  const wheelAreaRef = useRef(null);
  const virtualIndexRef = useRef(optionCount + selectedIndex);
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
    lastX: 0,
    startX: 0,
  });

  useEffect(() => {
    const nextVirtualIndex = optionCount + selectedIndex;
    virtualIndexRef.current = nextVirtualIndex;
    dragOffsetRef.current = 0;
    setVirtualIndex(nextVirtualIndex);
    setDragOffset(0);
  }, [optionCount, selectedIndex]);

  const commitVirtualIndex = useCallback(
    (nextVirtualIndex) => {
      if (disabled) return;

      const actualIndex = mod(nextVirtualIndex, optionCount);
      const nextRoundCount = ROUND_COUNT_OPTIONS[actualIndex];
      if (!nextRoundCount || nextRoundCount === selectedRoundCount) return;

      onChange?.(nextRoundCount);
    },
    [disabled, onChange, optionCount, selectedRoundCount],
  );

  const moveToVirtualIndex = useCallback(
    (nextVirtualIndex, { commit = true } = {}) => {
      virtualIndexRef.current = nextVirtualIndex;
      dragOffsetRef.current = 0;
      setVirtualIndex(nextVirtualIndex);
      setDragOffset(0);

      if (commit) {
        commitVirtualIndex(nextVirtualIndex);
      }
    },
    [commitVirtualIndex],
  );

  const stepWheel = useCallback(
    (direction) => {
      moveToVirtualIndex(virtualIndexRef.current + direction);
    },
    [moveToVirtualIndex],
  );

  const moveWheelPreview = useCallback((nextVirtualIndex, nextOffset) => {
    virtualIndexRef.current = nextVirtualIndex;
    dragOffsetRef.current = nextOffset;
    setVirtualIndex(nextVirtualIndex);
    setDragOffset(nextOffset);
  }, []);

  useEffect(() => {
    if (dragging) return;

    const actualIndex = mod(virtualIndex, optionCount);
    const recenteredIndex = optionCount + actualIndex;
    if (virtualIndex === recenteredIndex) return;

    virtualIndexRef.current = recenteredIndex;
    setVirtualIndex(recenteredIndex);
  }, [dragging, optionCount, virtualIndex]);

  const handleWheel = useCallback(
    (event) => {
      if (disabled || optionCount < 2) return;

      event.preventDefault();
      event.stopPropagation();

      const primaryDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const normalizedDelta =
        event.deltaMode === 1
          ? primaryDelta * 16
          : event.deltaMode === 2
            ? primaryDelta * window.innerWidth
            : primaryDelta;

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
    },
    [disabled, optionCount, stepWheel],
  );

  useEffect(() => {
    const wheelArea = wheelAreaRef.current;
    if (!wheelArea) return undefined;

    const sampleItem = wheelArea.querySelector("[data-level-count-item]");
    const nextWidth =
      sampleItem?.getBoundingClientRect?.().width || FALLBACK_ITEM_WIDTH;
    setItemWidth(nextWidth);

    wheelArea.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      wheelArea.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const handlePointerDown = (event) => {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      lastX: event.clientX,
      startX: event.clientX,
    };

    dragOffsetRef.current = 0;
    setDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    if (!dragging) return undefined;

    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.active) return;
      if (dragState.pointerId !== null && event.pointerId !== dragState.pointerId) {
        return;
      }

      event.preventDefault();

      const deltaX = event.clientX - dragState.lastX;
      let nextVirtualIndex = virtualIndexRef.current;
      let nextOffset = dragOffsetRef.current + deltaX;
      const loopThreshold = itemWidth * DRAG_LOOP_THRESHOLD_RATIO;

      if (Math.abs(event.clientX - dragState.startX) > DRAG_START_THRESHOLD) {
        dragState.moved = true;
      }

      while (nextOffset > loopThreshold) {
        nextVirtualIndex -= 1;
        nextOffset -= itemWidth;
      }

      while (nextOffset < -loopThreshold) {
        nextVirtualIndex += 1;
        nextOffset += itemWidth;
      }

      dragState.lastX = event.clientX;
      moveWheelPreview(nextVirtualIndex, nextOffset);
    };

    const handlePointerEnd = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState.active) return;
      if (dragState.pointerId !== null && event.pointerId !== dragState.pointerId) {
        return;
      }

      const finalVirtualIndex = virtualIndexRef.current;
      const captureTarget = wheelAreaRef.current;

      dragStateRef.current = {
        active: false,
        moved: dragState.moved,
        pointerId: null,
        lastX: 0,
        startX: 0,
      };

      setDragging(false);
      moveToVirtualIndex(finalVirtualIndex);

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

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [dragging, itemWidth, moveToVirtualIndex, moveWheelPreview]);

  const items = useMemo(() => {
    const centerVirtualIndex = virtualIndex;

    return Array.from({ length: optionCount * COPY_COUNT }, (_, virtualItemIndex) => {
      const optionIndex = mod(virtualItemIndex, optionCount);
      const option = ROUND_COUNT_OPTIONS[optionIndex];
      const signedDistance = virtualItemIndex - centerVirtualIndex;
      const visualDistance = Math.abs(signedDistance + dragOffset / itemWidth);
      const x = signedDistance * itemWidth + dragOffset;
      const active = visualDistance < 0.5;
      const scale = active ? 1 : visualDistance < 1.15 ? 0.95 : 0.89;
      const opacity = active
        ? 1
        : visualDistance < 1.15
          ? 0.78
          : visualDistance < 1.95
            ? 0.3
            : 0;

      return {
        key: `${virtualItemIndex}-${option}`,
        option,
        optionIndex,
        virtualItemIndex,
        x,
        scale,
        opacity,
        active,
        zIndex: active ? 20 : Math.max(1, 12 - Math.round(visualDistance)),
      };
    });
  }, [dragOffset, itemWidth, optionCount, virtualIndex]);

  return (
    <div
      className={`level-count-picker card-control-frame card-action-height relative w-full min-w-0 overflow-hidden rounded-full p-1 text-white ${
        disabled ? "opacity-45" : ""
      } ${className}`}
      aria-label={t("levelCount.label")}
      aria-disabled={disabled}
    >
      <div
        ref={wheelAreaRef}
        onPointerDown={handlePointerDown}
        className={`relative h-full w-full cursor-grab overflow-hidden select-none touch-none active:cursor-grabbing ${
          dragging ? "level-count-picker--dragging" : ""
        }`}
      >
        <span className="level-count-picker__thumb" aria-hidden="true" />

        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            data-level-count-item
            aria-hidden={item.opacity === 0}
            aria-pressed={item.option === selectedRoundCount}
            aria-label={t("levelCount.option", { count: item.option })}
            onClick={() => {
              if (dragStateRef.current.moved) return;
              moveToVirtualIndex(item.virtualItemIndex);
            }}
            className={`absolute left-1/2 top-1/2 flex h-full w-[3rem] items-center justify-center rounded-full text-[0.98rem] font-semibold leading-none will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed sm:w-[3.2rem] sm:text-base ${
              dragging
                ? ""
                : "transition-[transform,opacity,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            } ${
              item.active ? "text-zinc-950" : "text-white/66"
            }`}
            style={{
              opacity: item.opacity,
              transform: `translate3d(calc(-50% + ${item.x}px), -50%, 0) scale(${item.scale})`,
              zIndex: item.zIndex,
            }}
          >
            <span className="block leading-none">{item.option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
