"use client";

import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { useTranslation } from "@/hooks/useLanguage";
import useVisualOverlayTones, {
  overlayTextColor,
  overlayTextShadow,
} from "@/hooks/useVisualOverlayTones";
import {
  getVisualLabel,
  gradientBackground,
  isBrandColor,
  isCartoonColor,
  isFlagColor,
} from "@/lib/color";
import CartoonOverlay from "./CartoonOverlay";
import FlagOverlay from "./FlagOverlay";
import BrandOverlay from "./BrandOverlay";

export default function GameCardShell({
  color,
  overlayToneSource = null,
  children,
  className = "",
  flagOverlayProps = {},
  cartoonOverlayProps = {},
  brandOverlayProps = {},
  brandLabelOffset = null,
  isExpanded = false,
  heightMode = "normal",
  ...props
}) {
  const { locale } = useTranslation();
  const cardHeight = useResponsiveCardHeight(isExpanded, heightMode);
  const isFlagCard = isFlagColor(color);
  const isCartoonCard = isCartoonColor(color);
  const isBrandCard = isBrandColor(color);
  const background = color ? gradientBackground(color) : null;
  const toneSource = overlayToneSource || color;
  const overlayTones = useVisualOverlayTones(toneSource);
  const foreground = overlayTextColor(overlayTones.topLeft);
  const overlayLabelStyle = {
    color: "var(--game-fg-bottom-left)",
    textShadow: "var(--game-fg-bottom-left-shadow)",
    ...(isBrandCard && Number.isFinite(brandLabelOffset?.base)
      ? {
          "--brand-label-left": `${brandLabelOffset.base}px`,
          "--brand-label-left-sm": `${brandLabelOffset.sm ?? brandLabelOffset.base}px`,
        }
      : {}),
  };
  const visualLabel = getVisualLabel(color, locale);
  const cardStyle = {
    background: background || undefined,
    color: color ? foreground : "#ffffff",
    "--game-fg-top-left": overlayTextColor(overlayTones.topLeft),
    "--game-fg-top-left-shadow": overlayTextShadow(overlayTones.topLeft),
    "--game-fg-top-right": overlayTextColor(overlayTones.topRight),
    "--game-fg-top-right-shadow": overlayTextShadow(overlayTones.topRight),
    "--game-fg-bottom-left": overlayTextColor(overlayTones.bottomLeft),
    "--game-fg-bottom-left-shadow": overlayTextShadow(overlayTones.bottomLeft),
    "--game-fg-bottom-right": overlayTextColor(overlayTones.bottomRight),
    "--game-fg-bottom-right-shadow": overlayTextShadow(overlayTones.bottomRight),
  };
  const allowsExternalControls = className.includes("flag-game-card-shell");

  if (cardHeight) {
    cardStyle.height = cardHeight;
  }

  return (
    <section
      suppressHydrationWarning
      className={`game-card-shell relative w-full max-w-125 overflow-visible rounded-[26px] bg-surface shadow-[var(--app-card-shadow)] transition-[height,transform] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] ${className}`}
      style={cardStyle}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {isFlagCard && <FlagOverlay color={color} {...flagOverlayProps} />}
        {isCartoonCard && (
          <CartoonOverlay color={color} {...cartoonOverlayProps} />
        )}
        {isBrandCard && <BrandOverlay color={color} {...brandOverlayProps} />}
        {(isFlagCard || isCartoonCard || isBrandCard) && visualLabel && (
          <span
            className={`pointer-events-none absolute z-12 max-w-[45%] truncate text-base font-semibold ${
              isBrandCard
                ? "top-6 left-1/2 -translate-x-1/2 text-center sm:top-8"
                : "bottom-6 left-6 sm:bottom-8 sm:left-8"
            }`}
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
