"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import AdminProtectorCard from "./AdminProtectorCard";

export default function AdminProtectorOverlay({ onCancel, onUnlock }) {
  const scopeRef = useRef(null);
  const backgroundRef = useRef(null);

  useScreenReveal(scopeRef, [], { delay: 120 });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        backgroundRef.current,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.34,
          ease: "power2.out",
          overwrite: true,
        },
      );
    }, scopeRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={scopeRef}
      className="absolute inset-0 z-40 overflow-hidden p-6 text-white sm:p-8"
    >
      <div ref={backgroundRef} className="absolute inset-0 bg-black" />

      <div className="relative z-10 h-full">
        <AdminProtectorCard onCancel={onCancel} onUnlock={onUnlock} />
      </div>
    </div>
  );
}
