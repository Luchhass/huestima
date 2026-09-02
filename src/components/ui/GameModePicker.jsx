"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Blend,
  Eye,
  Flag,
  Infinity,
  Layers,
  Palette,
  Swords,
  Timer,
  Zap,
} from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_MODE_OPTIONS } from "@/lib/constants";
import { playGameModeSelect } from "@/lib/sound";

const ICONS = { normal: Eye, endless: Infinity, flash: Zap, sequence: Layers, timed: Timer, sprint: Zap, gradient: Blend, flag: Flag, cartoon: Palette, duel: Swords };
const SNAP_THRESHOLD = 0.28;

function wrap(index, length) {
  return length ? ((index % length) + length) % length : 0;
}

function distance(index, center, length) {
  if (length < 2) return index - center;
  let result = index - center;
  if (result > length / 2) result -= length;
  if (result < -length / 2) result += length;
  return result;
}

export default function GameModePicker({ value, onChange, ariaLabel, disabled = false, className = "", options = GAME_MODE_OPTIONS }) {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const [width, setWidth] = useState(280);
  const selectedIndex = Math.max(options.findIndex((item) => item.id === value), 0);
  const [index, setIndex] = useState(selectedIndex);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const currentIndex = dragging ? index : selectedIndex;

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return undefined;
    const update = () => setWidth(node.getBoundingClientRect().width || 280);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const select = useCallback((nextIndex) => {
    const safeIndex = wrap(nextIndex, options.length);
    const option = options[safeIndex];
    if (!option || disabled) return;
    setIndex(safeIndex);
    setOffset(0);
    if (option.id !== value) {
      playGameModeSelect(option.id, safeIndex);
      onChange(option.id);
    }
  }, [disabled, onChange, options, value]);

  const handlePointerDown = (event) => {
    if (disabled || options.length < 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
    dragRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      moved: false,
      originIndex: currentIndex,
      previewIndex: currentIndex,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 5) drag.moved = true;
    let nextIndex = drag.originIndex;
    let nextOffset = delta;
    while (nextOffset > width * SNAP_THRESHOLD) { nextIndex -= 1; nextOffset -= width; }
    while (nextOffset < -width * SNAP_THRESHOLD) { nextIndex += 1; nextOffset += width; }
    drag.previewIndex = nextIndex;
    setIndex(wrap(nextIndex, options.length));
    setOffset(nextOffset);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    select(drag.moved ? drag.previewIndex : currentIndex);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleWheel = (event) => {
    if (disabled || options.length < 2) return;
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) >= 12) select(currentIndex + (delta > 0 ? 1 : -1));
  };

  const handleKeyDown = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    select(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
  };

  return (
    <div
      ref={trackRef}
      role="listbox"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel || t("gameMode.label")}
      aria-disabled={disabled}
      data-dragging={dragging ? "true" : "false"}
      className={`game-mode-picker card-control-frame card-action-height relative min-w-0 cursor-grab overflow-hidden select-none outline-none active:cursor-grabbing ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      style={{ touchAction: "pan-y" }}
    >
      {options.map((option, optionIndex) => {
        const itemDistance = distance(optionIndex, currentIndex, options.length);
        const active = optionIndex === currentIndex && Math.abs(offset) < width * 0.5;
        const Icon = ICONS[option.id] || Eye;
        const label = option.id === "flag" || option.id === "cartoon" ? t("gameMode.normal") : t(`gameMode.${option.id}`);
        return (
          <div
            key={option.id}
            id={`game-mode-${option.id}`}
            role="option"
            aria-selected={active}
            className={`game-mode-picker__item pointer-events-none absolute inset-0 flex items-center px-4 text-left text-white will-change-transform ${dragging ? "" : "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"}`}
            style={{
              opacity: Math.abs(itemDistance) > 1 ? 0 : 1,
              transform: `translate3d(${itemDistance * width + offset}px, 0, 0)`,
              zIndex: active ? 2 : 1,
            }}
          >
            <span className="game-mode-picker__icon grid h-8 w-9 shrink-0 place-items-center sm:h-9 sm:w-10">
              <Icon className="size-[1.15rem] sm:size-5" strokeWidth={2} />
            </span>
            <span className="ml-2.5 flex min-w-0 flex-1 items-center pr-10 sm:ml-3">
              <span className="block truncate text-base font-semibold leading-none sm:text-[1.05rem]">
                {label}
              </span>
            </span>
            {options.length > 1 && (
              <span className="game-mode-picker__count absolute right-4 top-1/2 -translate-y-1/2 text-[0.68rem] font-semibold leading-none tabular-nums tracking-[0.01em]">
                {optionIndex + 1}/{options.length}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
