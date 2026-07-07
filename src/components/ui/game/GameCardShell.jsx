"use client";

import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import {
  colorToneHex,
  gradientBackground,
  isCartoonColor,
  isFlagColor,
  readableTone,
} from "@/lib/color";
import CartoonOverlay from "./CartoonOverlay";
import FlagOverlay from "./FlagOverlay";

export default function GameCardShell({
  color,
  children,
  className = "",
  flagOverlayProps = {},
  cartoonOverlayProps = {},
  isExpanded = false,
  ...props
}) {
  const cardHeight = useResponsiveCardHeight(isExpanded);
  const isFlagCard = isFlagColor(color);
  const isCartoonCard = isCartoonColor(color);
  const background = color ? gradientBackground(color) : null;
  const tone = color ? readableTone(colorToneHex(color)) : "dark";
  const foreground = isCartoonCard
    ? "#fffaf3"
    : tone === "dark"
      ? "#171413"
      : "#fffaf3";
  const muted = isCartoonCard
    ? "rgba(255,250,243,0.78)"
    : tone === "dark"
      ? "rgba(23,20,19,0.64)"
      : "rgba(255,250,243,0.72)";
  const cardStyle = {
    background: background || undefined,
    color: color ? foreground : "#ffffff",
    "--game-muted": color ? muted : "rgba(255,255,255,0.72)",
    textShadow: isCartoonCard ? "0 2px 12px rgba(0,0,0,0.52)" : undefined,
  };

  if (cardHeight) {
    cardStyle.height = cardHeight;
  }

  return (
    <section
      className={`game-card-shell relative w-full max-w-125 overflow-hidden rounded-[26px] bg-surface shadow-[0_18px_38px_rgba(31,25,20,0.18),0_8px_18px_rgba(31,25,20,0.1)] transition-[height,transform] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.52),0_8px_18px_rgba(0,0,0,0.32)] ${className}`}
      style={cardStyle}
      {...props}
    >
      {isFlagCard && <FlagOverlay color={color} {...flagOverlayProps} />}
      {isCartoonCard && (
        <CartoonOverlay color={color} {...cartoonOverlayProps} />
      )}
      {isFlagCard && color.flagLabel && (
        <span className="pointer-events-none absolute bottom-6 left-6 z-12 max-w-[45%] truncate text-base font-semibold lowercase text-current/78 sm:bottom-8 sm:left-8">
          {color.flagLabel}
        </span>
      )}
      {isCartoonCard && color.cartoonLabel && (
        <span className="pointer-events-none absolute bottom-6 left-6 z-12 max-w-[45%] truncate text-base font-semibold lowercase text-current/78 sm:bottom-8 sm:left-8">
          {color.cartoonLabel}
        </span>
      )}
      {children}
    </section>
  );
}
