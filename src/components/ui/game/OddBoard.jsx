"use client";

import { playPatternTileHover } from "@/lib/sound";

export default function OddBoard({
  puzzle,
  interactive = false,
  selectedIndex = null,
  revealAnswer = false,
  onTile,
}) {
  if (!puzzle?.colors?.length) return null;

  return (
    <div className="absolute inset-2 grid grid-cols-3 grid-rows-2 gap-2">
      {puzzle.colors.map((color, index) => {
        const isSelected = index === selectedIndex;
        const isCorrect = index === puzzle.oddIndex;
        const showCorrect = revealAnswer && isCorrect;
        const showWrong = revealAnswer && isSelected && !isCorrect;

        return (
          <button
            key={index}
            type="button"
            data-custom-guess-item
            data-hover-sound="off"
            disabled={!interactive}
            onPointerEnter={interactive ? playPatternTileHover : undefined}
            onClick={() => onTile?.(index)}
            aria-label={`Odd tile ${index + 1}`}
            className={`relative min-h-0 transition-[transform,box-shadow,filter] duration-200 ease-out focus:outline-none ${
              interactive ? "cursor-pointer hover:scale-[1.015] active:scale-[0.985]" : "cursor-default"
            } ${showCorrect ? "z-10 brightness-[1.035] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.72),0_0_20px_rgba(255,255,255,0.24),0_8px_18px_rgba(0,0,0,0.16)]" : ""} ${
              showWrong ? "z-10 shadow-[inset_0_0_0_2px_rgba(248,113,113,0.9),0_0_18px_rgba(248,113,113,0.22)]" : ""
            }`}
            style={{
              background: color,
              borderTopLeftRadius: index === 0 ? "18px" : "9px",
              borderTopRightRadius: index === 2 ? "18px" : "9px",
              borderBottomLeftRadius: index === 3 ? "18px" : "9px",
              borderBottomRightRadius: index === 5 ? "18px" : "9px",
            }}
          />
        );
      })}
    </div>
  );
}
