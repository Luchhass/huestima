"use client";

import ColorSlider from "./ColorSlider";
import { useTranslation } from "@/hooks/useLanguage";
import { hueGradient } from "@/lib/color";

export default function HueSlider({ value, onChange, trackClassName, handleClassName, showLabel }) {
  const { t } = useTranslation();

  return (
    <ColorSlider
      label={t("colorPicker.hue")}
      min={0}
      max={359}
      value={value}
      valueText={t("colorPicker.degrees", { value: Math.round(value) })}
      gradient={hueGradient()}
      onChange={onChange}
      trackClassName={trackClassName}
      handleClassName={handleClassName}
      showLabel={showLabel}
    />
  );
}
