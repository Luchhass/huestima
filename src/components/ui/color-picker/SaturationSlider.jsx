"use client";

import ColorSlider from "./ColorSlider";
import { useTranslation } from "@/hooks/useLanguage";
import { saturationGradient } from "@/lib/color";

export default function SaturationSlider({
  hue,
  value,
  brightness,
  onChange,
  trackClassName,
  handleClassName,
  showLabel,
  orientation,
}) {
  const { t } = useTranslation();

  return (
    <ColorSlider
      label={t("colorPicker.saturation")}
      min={0}
      max={100}
      value={value}
      valueText={t("colorPicker.saturationPercent", {
        value: Math.round(value),
      })}
      gradient={saturationGradient(hue, brightness)}
      onChange={onChange}
      trackClassName={trackClassName}
      handleClassName={handleClassName}
      showLabel={showLabel}
      orientation={orientation}
    />
  );
}
