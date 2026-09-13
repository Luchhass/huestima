"use client";

import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { playPatternTileHover } from "@/lib/sound";

export default function PatternBoard({
  puzzle,
  board,
  selected = null,
  interactive = false,
  showMisplacedHint = false,
  onTile,
}) {
  const tileRefs = useRef(new Map());
  const liftAnimationRef = useRef(null);
  const swapAnimationsRef = useRef([]);

  useEffect(() => {
    liftAnimationRef.current?.cancel();
    liftAnimationRef.current = null;

    if (!interactive || selected === null) {
      return undefined;
    }

    const element = tileRefs.current.get(selected);
    if (!element) return undefined;
    liftAnimationRef.current = element.animate(
      [
        { transform: "translate3d(0, 0, 0) rotate(0deg)" },
        { transform: "translate3d(0, -12px, 0) rotate(-2deg)" },
      ],
      {
        duration: 180,
        easing: "cubic-bezier(0.22, 0.8, 0.28, 1)",
        fill: "forwards",
      },
    );

    return () => {
      liftAnimationRef.current?.cancel();
      liftAnimationRef.current = null;
    };
  }, [interactive, selected]);

  useEffect(
    () => () => {
      liftAnimationRef.current?.cancel();
      swapAnimationsRef.current.forEach((animation) => animation.cancel());
    },
    [],
  );

  const handleTileClick = (position) => {
    if (!interactive) return;
    if (selected === null || selected === position) {
      onTile?.(position);
      return;
    }

    const selectedElement = tileRefs.current.get(selected);
    const targetElement = tileRefs.current.get(position);
    if (!selectedElement || !targetElement) {
      onTile?.(position);
      return;
    }

    const selectedVisualRect = selectedElement.getBoundingClientRect();
    const targetVisualRect = targetElement.getBoundingClientRect();
    swapAnimationsRef.current.forEach((animation) => animation.cancel());
    swapAnimationsRef.current = [];
    selectedElement.style.zIndex = "";
    targetElement.style.zIndex = "";
    liftAnimationRef.current?.cancel();
    liftAnimationRef.current = null;
    flushSync(() => onTile?.(position));

    const selectedRect = selectedElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    selectedElement.style.zIndex = "31";
    targetElement.style.zIndex = "30";
    const options = {
      duration: 650,
      easing: "cubic-bezier(0.22, 0.8, 0.28, 1)",
      fill: "none",
    };
    const animations = [
      selectedElement.animate(
        [
          {
            transform: `translate3d(${targetVisualRect.left - selectedRect.left}px, ${targetVisualRect.top - selectedRect.top}px, 0)`,
          },
          { transform: "translate3d(0, 0, 0)" },
        ],
        options,
      ),
      targetElement.animate(
        [
          {
            transform: `translate3d(${selectedVisualRect.left - targetRect.left}px, ${selectedVisualRect.top - targetRect.top}px, 0)`,
          },
          { transform: "translate3d(0, 0, 0)" },
        ],
        options,
      ),
    ];
    swapAnimationsRef.current = animations;

    Promise.allSettled(animations.map((animation) => animation.finished)).then(
      () => {
        if (swapAnimationsRef.current !== animations) return;
        selectedElement.style.zIndex = "";
        targetElement.style.zIndex = "";
        swapAnimationsRef.current = [];
      },
    );
  };

  useEffect(() => {
    if (!showMisplacedHint || !puzzle || !Array.isArray(board)) return undefined;

    const wrongPositions = board
      .map((tile, position) => (tile === position ? null : position))
      .filter((position) => position !== null);
    const hasMisplacedTiles = wrongPositions.length > 0;

    let timeoutId = null;
    let activeAnimations = [];

    const errorPulseDuration = hasMisplacedTiles ? 720 : 0;
    const moveDuration = hasMisplacedTiles ? 650 : 0;
    const waveStartDelay = hasMisplacedTiles ? 120 : 0;
    const waveStepDuration = 90;
    const tileCompletionDuration = 840;
    const returnDuration = hasMisplacedTiles ? 650 : 0;
    const wrongBoardPause = 3000;

    const demonstrateCompletedPattern = () => {
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations = [];

      const misplacedTiles = wrongPositions
        .map((position) => ({
          position,
          targetPosition: board[position],
          element: tileRefs.current.get(position),
        }))
        .filter(({ element, targetPosition }) =>
          element && tileRefs.current.get(targetPosition),
        );

      const targetRects = new Map(
        misplacedTiles.map(({ targetPosition }) => [
          targetPosition,
          tileRefs.current.get(targetPosition).getBoundingClientRect(),
        ]),
      );

      const maxWaveDelay =
        (puzzle.rows + puzzle.columns - 2) * waveStepDuration;
      const completionEnd = maxWaveDelay + tileCompletionDuration;
      const moveStart = errorPulseDuration;
      const completionStart = moveStart + moveDuration + waveStartDelay;
      const returnStart =
        completionStart + completionEnd;
      const sequenceDuration = returnStart + returnDuration;

      const errorPulseAnimations = misplacedTiles.map(
        ({ position, element }) => {
          const originalColor = puzzle.colors[board[position]];
          return element.animate(
            [
              {
                backgroundColor: originalColor,
                offset: 0,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              {
                backgroundColor: "#ffffff",
                offset: 0.12,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              {
                backgroundColor: originalColor,
                offset: 0.25,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              {
                backgroundColor: "#ffffff",
                offset: 0.38,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              {
                backgroundColor: originalColor,
                offset: 0.51,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              {
                backgroundColor: "#ffffff",
                offset: 0.64,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              { backgroundColor: originalColor, offset: 0.78 },
              { backgroundColor: originalColor, offset: 1 },
            ],
            {
              duration: errorPulseDuration,
              fill: "none",
            },
          );
        },
      );

      const moveAnimations = misplacedTiles.map(
        ({ position, element, targetPosition }) => {
          const sourceRect = element.getBoundingClientRect();
          const targetRect = targetRects.get(targetPosition);
          const x = targetRect.left - sourceRect.left;
          const y = targetRect.top - sourceRect.top;
          element.style.zIndex = String(position + 20);

          const animation = element.animate(
            [
              {
                transform: "translate3d(0, 0, 0)",
                offset: 0,
              },
              {
                transform: "translate3d(0, 0, 0)",
                offset: moveStart / sequenceDuration,
                easing: "cubic-bezier(0.22, 0.8, 0.28, 1)",
              },
              {
                transform: `translate3d(${x}px, ${y}px, 0)`,
                offset: (moveStart + moveDuration) / sequenceDuration,
                easing: "linear",
              },
              {
                transform: `translate3d(${x}px, ${y}px, 0)`,
                offset: returnStart / sequenceDuration,
                easing: "cubic-bezier(0.22, 0.8, 0.28, 1)",
              },
              { transform: "translate3d(0, 0, 0)" },
            ],
            {
              duration: sequenceDuration,
              fill: "none",
            },
          );
          animation.onfinish = () => {
            element.style.zIndex = "";
          };
          animation.oncancel = () => {
            element.style.zIndex = "";
          };
          return animation;
        },
      );

      const completionAnimations = board
        .map((tile, position) => {
          const element = tileRefs.current.get(position);
          if (!element) return null;

          const correctedPosition = tile;
          const row = Math.floor(correctedPosition / puzzle.columns);
          const column = correctedPosition % puzzle.columns;
          // Diagonal order: 1x1 -> (1x2, 2x1) -> (1x3, 2x2, 3x1) ...
          const diagonalIndex = row + column;
          const tileWaveDelay = diagonalIndex * waveStepDuration;
          const originalColor = puzzle.colors[tile];

          return element.animate(
            [
              {
                backgroundColor: originalColor,
                offset: 0,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              {
                backgroundColor: "#ffffff",
                offset: 0.3,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              {
                backgroundColor: "#000000",
                offset: 0.65,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              },
              { backgroundColor: originalColor, offset: 1 },
            ],
            {
              delay: completionStart + tileWaveDelay,
              duration: tileCompletionDuration,
              fill: "none",
            },
          );
        })
        .filter(Boolean);

      activeAnimations = [
        ...errorPulseAnimations,
        ...moveAnimations,
        ...completionAnimations,
      ];

      timeoutId = window.setTimeout(
        demonstrateCompletedPattern,
        sequenceDuration + wrongBoardPause,
      );
    };

    timeoutId = window.setTimeout(() => {
      demonstrateCompletedPattern();
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
      activeAnimations.forEach((animation) => animation.cancel());
    };
  }, [board, puzzle?.columns, puzzle?.rows, showMisplacedHint]);

  if (!puzzle || !Array.isArray(board)) return null;

  return (
    <div className="pointer-events-none absolute inset-2 z-10">
      <div
        className="grid h-full w-full min-h-0 min-w-0 gap-2"
        style={{
          gridTemplateColumns: `repeat(${puzzle.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${puzzle.rows}, minmax(0, 1fr))`,
        }}
      >
        {board.map((tile, position) => (
          <button
            key={position}
            ref={(element) => {
              if (element) tileRefs.current.set(position, element);
              else tileRefs.current.delete(position);
            }}
            type="button"
            data-custom-guess-item
            data-hover-sound="off"
            disabled={!interactive}
            aria-label={`Tile ${position + 1}`}
            aria-pressed={selected === position}
            onPointerEnter={interactive ? playPatternTileHover : undefined}
            onClick={() => handleTileClick(position)}
            className={`pointer-events-auto h-full w-full shadow-[0_2px_5px_rgba(0,0,0,0.16)] outline-none will-change-transform ${
              selected === position
                ? "z-30 shadow-[0_0_0_3px_#fff,0_0_12px_4px_rgba(255,255,255,0.42),0_10px_18px_rgba(0,0,0,0.28)]"
                : interactive
                  ? "focus-visible:shadow-[0_0_0_3px_#fff]"
                  : ""
            }`}
            style={{
              background: puzzle.colors[tile],
              borderTopLeftRadius: position === 0 ? "18px" : "9px",
              borderTopRightRadius:
                position === puzzle.columns - 1 ? "18px" : "9px",
              borderBottomLeftRadius:
                position === board.length - puzzle.columns ? "18px" : "9px",
              borderBottomRightRadius:
                position === board.length - 1 ? "18px" : "9px",
            }}
          />
        ))}
      </div>
    </div>
  );
}
