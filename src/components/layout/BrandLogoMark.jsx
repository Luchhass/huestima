"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function BrandLogoMark({
  className = "size-9",
  centerClassName = "size-4",
  hollow = false,
  interactive = false,
}) {
  const gradientRef = useRef(null);

  useEffect(() => {
    if (!interactive || !gradientRef.current) return undefined;

    const spin = gsap.to(gradientRef.current, {
      rotation: 360,
      duration: 8,
      ease: "none",
      repeat: -1,
      transformOrigin: "50% 50%",
    });
    const root = gradientRef.current.parentElement;
    const hoverTarget = root.closest("a, button") || root;
    const speedUp = () =>
      gsap.to(spin, {
        timeScale: 24,
        duration: 0.42,
        ease: "power2.out",
        overwrite: true,
      });
    const slowDown = () =>
      gsap.to(spin, {
        timeScale: 1,
        duration: 0.62,
        ease: "power2.out",
        overwrite: true,
      });

    hoverTarget.addEventListener("pointerenter", speedUp);
    hoverTarget.addEventListener("pointerleave", slowDown);

    return () => {
      hoverTarget.removeEventListener("pointerenter", speedUp);
      hoverTarget.removeEventListener("pointerleave", slowDown);
      spin.kill();
    };
  }, [interactive]);

  return (
    <span
      className={[
        "relative grid place-items-center rounded-full",
        className,
      ].join(" ")}
    >
      <span
        ref={gradientRef}
        className={`gradient-icon-flow absolute inset-0 rounded-full opacity-95 ${interactive ? "gradient-icon-flow--interactive" : ""}`}
      />
      <span
        className={[
          "relative rounded-full",
          hollow ? "bg-black" : "bg-background shadow-inner",
          centerClassName,
        ].join(" ")}
      />
    </span>
  );
}
