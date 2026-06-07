"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";

const SLOT_HEIGHT_EM = 0.84;
const SECOND_TICK_VISUAL_SYNC_DELAY = 0.032;

const REEL_CONFIG = [
  {
    place: 100,
    toneClassName: "text-current/88",
    duration: 0.34,
    ease: "expo.out",
  },
  {
    place: 10,
    toneClassName: "text-current/42",
    duration: 0.072,
    ease: "power3.out",
  },
  {
    place: 1,
    toneClassName: "text-current/42",
  },
];

function getDigit(value, place) {
  return Math.floor(value / place) % 10;
}

function buildReelFrames(totalCentiseconds, place) {
  const frames = [
    {
      digit: getDigit(totalCentiseconds, place),
      at: 0,
    },
  ];

  let previousDigit = frames[0].digit;

  for (let elapsed = 1; elapsed <= totalCentiseconds; elapsed += 1) {
    const remaining = totalCentiseconds - elapsed;
    const nextDigit = getDigit(remaining, place);

    if (nextDigit !== previousDigit) {
      frames.push({
        digit: nextDigit,
        at: elapsed / 100,
      });

      previousDigit = nextDigit;
    }
  }

  return frames;
}

export default function CountdownReel({
  durationMs,
  currentCentiseconds,
  onSecondTick,
  sizeClassName = "text-7xl sm:text-[7rem]",
  className = "",
}) {
  const reelTrackRefs = useRef([]);
  const totalCentiseconds = Math.max(0, Math.round(durationMs / 10));
  const timerDigits = String(
    Math.max(0, currentCentiseconds ?? totalCentiseconds),
  ).padStart(3, "0");

  const reels = useMemo(
    () =>
      REEL_CONFIG.map((reel) => ({
        ...reel,
        frames: buildReelFrames(totalCentiseconds, reel.place),
      })),
    [totalCentiseconds],
  );

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const counterTimeline = gsap.timeline();
      const durationSeconds = Math.max(0.001, durationMs / 1000);

      reels.forEach((reel, reelIndex) => {
        const track = reelTrackRefs.current[reelIndex];

        if (!track) return;

        gsap.set(track, {
          y: "0em",
          force3D: true,
        });

        if (reel.place === 1) {
          counterTimeline.to(
            track,
            {
              y: `-${(reel.frames.length - 1) * SLOT_HEIGHT_EM}em`,
              duration: durationSeconds,
              ease: "none",
              force3D: true,
            },
            0,
          );

          return;
        }

        reel.frames.slice(1).forEach((frame, frameIndex) => {
          counterTimeline.to(
            track,
            {
              y: `-${(frameIndex + 1) * SLOT_HEIGHT_EM}em`,
              duration: reel.duration,
              ease: reel.ease,
              force3D: true,
            },
            frame.at,
          );

          if (reel.place === 100 && onSecondTick) {
            const progress = Math.min(
              1,
              Math.max(0, frame.at / durationSeconds),
            );

            counterTimeline.call(
              () => onSecondTick(progress),
              undefined,
              frame.at + SECOND_TICK_VISUAL_SYNC_DELAY,
            );
          }
        });
      });
    });

    return () => ctx.revert();
  }, [durationMs, onSecondTick, reels]);

  return (
    <div
      className={`inline-grid w-[2.08em] grid-cols-3 justify-end font-mono font-semibold tracking-normal tabular-nums ${sizeClassName} ${className}`}
      aria-label={timerDigits}
    >
      <span className="sr-only">{timerDigits}</span>

      {reels.map((reel, reelIndex) => (
        <span
          key={reel.place}
          aria-hidden="true"
          className={`relative block h-[0.84em] overflow-hidden ${reel.toneClassName}`}
        >
          <span
            ref={(element) => {
              reelTrackRefs.current[reelIndex] = element;
            }}
            className="absolute inset-x-0 top-0 block will-change-transform"
          >
            {reel.frames.map((frame, frameIndex) => (
              <span
                key={`${reel.place}-${frameIndex}-${frame.digit}`}
                className="block h-[0.84em] text-right leading-[0.84em]"
              >
                {frame.digit}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}
