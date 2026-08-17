"use client";

import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { useTranslation } from "@/hooks/useLanguage";
import {
  colorToneHex,
  getVisualLabel,
  gradientBackground,
  isCartoonColor,
  isFlagColor,
  readableOverlayTone,
} from "@/lib/color";
import CartoonOverlay from "./CartoonOverlay";
import FlagOverlay from "./FlagOverlay";

export default function GameCardShell({
  color,
  overlayToneSource = null,
  children,
  className = "",
  flagOverlayProps = {},
  cartoonOverlayProps = {},
  isExpanded = false,
  heightMode = "normal",
  ...props
}) {
  const { locale } = useTranslation();
  const cardHeight = useResponsiveCardHeight(isExpanded, heightMode);
  const isFlagCard = isFlagColor(color);
  const isCartoonCard = isCartoonColor(color);
  const background = color ? gradientBackground(color) : null;
  const toneSource = overlayToneSource || color;
  const tone = toneSource ? readableOverlayTone(colorToneHex(toneSource)) : "dark";
  const foreground = tone === "dark" ? "#171413" : "#fffaf3";
  const muted =
    tone === "dark" ? "rgba(23,20,19,0.74)" : "rgba(255,250,243,0.8)";
  const overlayLabelStyle = {
    color: muted,
    textShadow:
      tone === "dark"
        ? "0 1px 2px rgba(255,250,243,0.12)"
        : "0 2px 10px rgba(0,0,0,0.34)",
  };
  const visualLabel = getVisualLabel(color, locale);
  const cardStyle = {
    background: background || undefined,
    color: color ? foreground : "#ffffff",
    "--game-muted": color ? muted : "rgba(255,255,255,0.72)",
  };
  const allowsExternalControls = className.includes("flag-game-card-shell");

  if (cardHeight) {
    cardStyle.height = cardHeight;
  }

  return (
    <section
      className={`game-card-shell relative w-full max-w-125 overflow-visible rounded-[26px] bg-surface shadow-[0_18px_38px_rgba(31,25,20,0.18),0_8px_18px_rgba(31,25,20,0.1)] transition-[height,transform] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.52),0_8px_18px_rgba(0,0,0,0.32)] ${className}`}
      style={cardStyle}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {isFlagCard && <FlagOverlay color={color} {...flagOverlayProps} />}
        {isCartoonCard && (
          <CartoonOverlay color={color} {...cartoonOverlayProps} />
        )}
        {isFlagCard && visualLabel && (
          <span
            className="pointer-events-none absolute bottom-6 left-6 z-12 max-w-[45%] truncate text-base font-semibold sm:bottom-8 sm:left-8"
            style={overlayLabelStyle}
          >
            {visualLabel}
          </span>
        )}
        {isCartoonCard && visualLabel && (
          <span
            className="pointer-events-none absolute bottom-6 left-6 z-12 max-w-[45%] truncate text-base font-semibold sm:bottom-8 sm:left-8"
            style={overlayLabelStyle}
          >
            {visualLabel}
          </span>
        )}
      </div>
      <div
        className={`relative z-10 h-full rounded-[inherit] ${allowsExternalControls ? "overflow-visible" : "overflow-hidden"}`}
      >
        {children}
      </div>
    </section>
  );
}
