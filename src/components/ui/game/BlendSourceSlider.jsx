"use client";

import ColorSlider from "@/components/ui/color-picker/ColorSlider";
import { hsvToHex } from "@/lib/color";
import { useTranslation } from "@/hooks/useLanguage";
import { BLEND_SOURCE_HUES } from "../../../../shared/blendMechanics.mjs";

export default function BlendSourceSlider({
  sourceIndex,
  value,
  onChange,
  trackClassName = "",
  handleClassName = "",
  hintValue = null,
  showHint = false,
  hintColor,
}) {
  const { t } = useTranslation();
  const baseHue = BLEND_SOURCE_HUES[sourceIndex] ?? 0;
  const gradient = `linear-gradient(to top, #000000, ${hsvToHex({ h: baseHue, s: 100, v: 100 })})`;

  return (
    <ColorSlider
      label={t("colorPicker.blendSource", { number: sourceIndex + 1 })}
      min={0}
      max={100}
      value={value}
      valueText={t("colorPicker.blendSourceValue", { value: Math.round(value) })}
      gradient={gradient}
      onChange={onChange}
      trackClassName={trackClassName}
      handleClassName={handleClassName}
      showLabel={false}
      hintValue={hintValue}
      showHint={showHint}
      hintColor={hintColor}
    />
  );
}
