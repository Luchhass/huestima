"use client";

import { X } from "lucide-react";
import { FLAG_DIFFICULTY_OPTIONS } from "../../../shared/flagDifficulty.mjs";
import { FLAG_OPTIONS } from "@/lib/flags";

export default function FlagPoolPicker({ value = [], onChange, onDone }) {
  const selected = new Set(value.length ? value : FLAG_DIFFICULTY_OPTIONS.map((item) => item.id));
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange?.(FLAG_DIFFICULTY_OPTIONS.filter((item) => next.has(item.id)).map((item) => item.id));
  };

  return (
    <div className="flex h-full flex-col text-white">
      <div data-screen-reveal className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.8rem,7vw,2.8rem)] font-semibold leading-none">Flag pools</h1>
          <p className="mt-2 text-sm font-medium text-white/65">Choose the flag difficulties you know.</p>
        </div>
        <button type="button" onClick={onDone} aria-label="Close flag pools" className="shrink-0 rounded-full p-1 text-white/80 transition-opacity hover:opacity-60">
          <X className="size-7" strokeWidth={1.8} />
        </button>
      </div>
      <div data-screen-reveal className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-2">
          {FLAG_DIFFICULTY_OPTIONS.map((item) => {
            const isSelected = selected.has(item.id);
            const poolFlags = FLAG_OPTIONS.filter((flag) => flag.difficulty === item.id);
            return (
              <div key={item.id} className="border-b border-white/15 px-1 py-2.5 last:border-b-0">
                <button type="button" onClick={() => toggle(item.id)} className={`flex items-center text-left text-sm font-semibold transition-colors ${isSelected ? "text-white" : "text-white/55 hover:text-white/80"}`}>
                  <span className={isSelected ? "" : "line-through decoration-1"}>{item.label} <span className="font-normal opacity-55">({poolFlags.length})</span></span>
                </button>
                <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] leading-tight ${isSelected ? "text-white/55" : "text-white/25"}`}>
                  {poolFlags.map((flag) => <span key={flag.id}>{flag.label}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div data-screen-reveal className="mt-3">
        <button type="button" onClick={onDone} disabled={!selected.size} className="card-action-height w-full rounded-full bg-white text-base font-semibold text-zinc-950 disabled:opacity-40">Done</button>
      </div>
    </div>
  );
}
