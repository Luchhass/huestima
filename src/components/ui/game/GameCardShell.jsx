"use client";

import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { colorToneHex, gradientBackground, readableTone } from "@/lib/color";

export default function GameCardShell({
  color,
  children,
  className = "",
  isExpanded = false,
  ...props
}) {
  const cardHeight = useResponsiveCardHeight(isExpanded);
  const background = color ? gradientBackground(color) : null;
  const tone = color ? readableTone(colorToneHex(color)) : "dark";
  const foreground = tone === "dark" ? "#171413" : "#fffaf3";
  const muted = tone === "dark" ? "rgba(23,20,19,0.64)" : "rgba(255,250,243,0.72)";
  const cardStyle = {
    background: background || undefined,
    color: color ? foreground : "#ffffff",
    "--game-muted": color ? muted : "rgba(255,255,255,0.72)",
  };

  if (cardHeight) {
    cardStyle.height = cardHeight;
  }

  return (
    <section
      className={`game-card-shell relative w-full max-w-125 overflow-hidden rounded-[26px] bg-surface shadow-[0_18px_38px_rgba(31,25,20,0.18),0_8px_18px_rgba(31,25,20,0.1)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.52),0_8px_18px_rgba(0,0,0,0.32)] ${className}`}
      style={cardStyle}
      {...props}
    >
      {children}
    </section>
  );
}
