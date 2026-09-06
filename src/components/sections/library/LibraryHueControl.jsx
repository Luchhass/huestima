"use client";

import HueSlider from "@/components/ui/color-picker/HueSlider";

export default function LibraryHueControl({ value, onChange }) {
  return (
    <aside
      className="fixed top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3"
      style={{ left: "max(1.5rem, calc((100vw - 68rem) / 4))" }}
      aria-label="Library hue control"
    >
      <HueSlider
        value={value}
        onChange={onChange}
        showLabel={false}
        trackClassName="h-[min(58vh,28rem)]! w-10! sm:w-11!"
      />
      <output className="min-w-11 rounded-full border border-white/20 bg-black/72 px-2 py-1 text-center text-[10px] font-semibold tabular-nums text-white/72 backdrop-blur-sm">
        {Math.round(value)}°
      </output>
    </aside>
  );
}
