"use client";

import { X } from "lucide-react";
import { CARTOON_PACKS } from "@/lib/cartoons";

export default function CartoonPoolPicker({ value = [], onChange, onDone }) {
  const allIds = CARTOON_PACKS.flatMap((pack) => pack.itemIds);
  const selectedIds = new Set(value.length ? value : allIds);
  const selectedPacks = new Set(
    CARTOON_PACKS.filter((pack) => pack.itemIds.every((id) => selectedIds.has(id))).map((pack) => pack.id),
  );
  const toggle = (pack) => {
    const nextPacks = new Set(selectedPacks);
    if (nextPacks.has(pack.id)) nextPacks.delete(pack.id);
    else nextPacks.add(pack.id);
    onChange?.(CARTOON_PACKS.filter((item) => nextPacks.has(item.id)).flatMap((item) => item.itemIds));
  };

  return (
    <div className="flex h-full flex-col text-white">
      <div data-screen-reveal className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.8rem,7vw,2.8rem)] font-semibold leading-none">Cartoon pool</h1>
          <p className="mt-2 text-sm font-medium text-white/65">Choose the cartoons you know.</p>
        </div>
        <button type="button" onClick={onDone} aria-label="Close cartoon pool" className="shrink-0 rounded-full p-1 text-white/80 transition-opacity hover:opacity-60">
          <X className="size-7" strokeWidth={1.8} />
        </button>
      </div>
      <div data-screen-reveal className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-2">
          {CARTOON_PACKS.map((item) => {
            const isSelected = selectedPacks.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item)}
                className={`relative flex min-h-12 w-full items-center justify-between gap-4 border-b border-white/15 px-1 py-2.5 text-left text-sm font-semibold transition-colors last:border-b-0 ${isSelected ? "text-white" : "text-white/55 hover:text-white/80"}`}
              >
                <span className={isSelected ? "" : "line-through decoration-1"}>
                  {item.label} <span className="font-normal opacity-55">({item.itemIds.length})</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div data-screen-reveal className="mt-3">
        <button type="button" onClick={onDone} disabled={!selectedPacks.size} className="card-action-height w-full rounded-full bg-white text-base font-semibold text-zinc-950 disabled:opacity-40">
          Done
        </button>
      </div>
    </div>
  );
}
