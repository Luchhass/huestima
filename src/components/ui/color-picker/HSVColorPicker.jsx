"use client";

import HueSlider from "./HueSlider";
import SaturationSlider from "./SaturationSlider";
import ValueSlider from "./ValueSlider";
import { useTranslation } from "@/hooks/useLanguage";
import { withHex } from "@/lib/color";

export default function HSVColorPicker({
  value,
  onChange,
  controls = ["h", "s", "v"],
  edge = false,
}) {
  const { t } = useTranslation();

  const update = (partial) => {
    onChange(withHex({ ...value, ...partial }));
  };

  const showHue = controls.includes("h");
  const showSaturation = controls.includes("s");
  const showValue = controls.includes("v");

  if (edge) {
    const trackClassName =
      "guess-picker-track h-full w-[50px] rounded-none border-0 shadow-none sm:h-full sm:w-[50px]";

    const handleClassName =
      "guess-picker-thumb size-5 shadow-[0_5px_14px_rgba(0,0,0,0.24)]";

    return (
      <div
        className="flex h-full items-stretch gap-0"
        aria-label={t("colorPicker.controls")}
      >
        {showHue && (
          <HueSlider
            value={value.h}
            onChange={(h) => update({ h })}
            trackClassName={`${trackClassName} rounded-l-[26px]`}
            handleClassName={handleClassName}
            showLabel={false}
          />
        )}

        {showSaturation && (
          <SaturationSlider
            hue={value.h}
            brightness={value.v}
            value={value.s}
            onChange={(s) => update({ s })}
            trackClassName={trackClassName}
            handleClassName={handleClassName}
            showLabel={false}
          />
        )}

        {showValue && (
          <ValueSlider
            hue={value.h}
            saturation={value.s}
            value={value.v}
            onChange={(v) => update({ v })}
            trackClassName={trackClassName}
            handleClassName={handleClassName}
            showLabel={false}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-4 sm:gap-5" aria-label={t("colorPicker.controls")}>
      {showHue && (
        <HueSlider
          value={value.h}
          onChange={(h) => update({ h })}
        />
      )}

      {showSaturation && (
        <SaturationSlider
          hue={value.h}
          brightness={value.v}
          value={value.s}
          onChange={(s) => update({ s })}
        />
      )}
      
      {showValue && (
        <ValueSlider
          hue={value.h}
          saturation={value.s}
          value={value.v}
          onChange={(v) => update({ v })}
        />
      )}
    </div>
  );
}
