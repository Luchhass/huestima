"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

const TARGET_SELECTOR = "[data-game-mode-shock-target]";
const DELAY_PATTERN = [0, 0.018, 0.007, 0.028, 0.014, 0.036, 0.022];

function readReducedMotion() {
  if (typeof window === "undefined") return true;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function targetOffset(index, amount) {
  return index % 2 === 0 ? amount : -amount;
}

export function useGameModeShock(scopeRef, triggerValue) {
  const previousValueRef = useRef(triggerValue);

  useLayoutEffect(() => {
    if (previousValueRef.current === triggerValue) return undefined;

    previousValueRef.current = triggerValue;

    if (readReducedMotion()) return undefined;

    const scope = scopeRef.current?.closest(".home-card") || scopeRef.current;
    if (!scope) return undefined;

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray(TARGET_SELECTOR, scope);

      targets.forEach((target, index) => {
        const delay =
          DELAY_PATTERN[index % DELAY_PATTERN.length] + Math.floor(index / 3) * 0.012;

        gsap.killTweensOf(target);
        gsap.set(target, {
          transformOrigin: "50% 50%",
          transformPerspective: 720,
          willChange: "transform,filter",
        });

        gsap
          .timeline({
            delay,
            defaults: {
              overwrite: "auto",
            },
          })
          .to(target, {
            x: targetOffset(index, 4),
            y: index % 3 === 0 ? -1.2 : 1.2,
            z: 6,
            rotationX: targetOffset(index, 1.2),
            rotationY: targetOffset(index + 1, 1.8),
            rotationZ: targetOffset(index, 0.35),
            skewX: targetOffset(index + 1, 0.28),
            scale: 1.006,
            filter:
              "drop-shadow(2.4px 0 rgba(255,23,77,0.95)) drop-shadow(-2.4px 0 rgba(0,229,255,0.95)) saturate(1.42) contrast(1.1)",
            duration: 0.045,
            ease: "power4.out",
          })
          .to(target, {
            x: targetOffset(index + 1, 3),
            y: index % 2 === 0 ? 1.4 : -1.4,
            z: -4,
            rotationX: targetOffset(index + 1, 0.9),
            rotationY: targetOffset(index, 1.4),
            rotationZ: targetOffset(index + 1, 0.25),
            skewX: targetOffset(index, 0.2),
            filter:
              "drop-shadow(-2px 0 rgba(255,23,77,0.88)) drop-shadow(2px 0 rgba(0,229,255,0.88)) saturate(1.5) contrast(1.12)",
            duration: 0.04,
            ease: "steps(2)",
          })
          .to(target, {
            x: targetOffset(index, 1.5),
            y: index % 3 === 1 ? -0.8 : 0.8,
            z: 2,
            rotationX: targetOffset(index, 0.45),
            rotationY: targetOffset(index + 1, 0.75),
            rotationZ: targetOffset(index, 0.12),
            skewX: 0,
            scale: 1.002,
            filter:
              "drop-shadow(1px 0 rgba(255,23,77,0.62)) drop-shadow(-1px 0 rgba(0,229,255,0.62)) saturate(1.2)",
            duration: 0.035,
            ease: "power2.out",
          })
          .to(target, {
            x: 0,
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            skewX: 0,
            scale: 1,
            filter: "none",
            duration: 0.24,
            ease: "power3.out",
            clearProps: "transform,filter,willChange",
          });
      });
    }, scope);

    return () => ctx.revert();
  }, [scopeRef, triggerValue]);
}
