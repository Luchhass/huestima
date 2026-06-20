"use client";

import ColorSlider from "./ColorSlider";
import { useTranslation } from "@/hooks/useLanguage";
import { valueGradient } from "@/lib/color";

export default function ValueSlider({
  hue,
  saturation,
  value,
  onChange,
  trackClassName,
  handleClassName,
  showLabel,
  orientation,
}) {
  const { t } = useTranslation();

  return (
    <ColorSlider
      label={t("colorPicker.brightness")}
      min={0}
      max={100}
      value={value}
      valueText={t("colorPicker.brightnessPercent", {
        value: Math.round(value),
      })}
      gradient={valueGradient(hue, saturation)}
      onChange={onChange}
      trackClassName={trackClassName}
      handleClassName={handleClassName}
      showLabel={showLabel}
      orientation={orientation}
    />
  );
}
