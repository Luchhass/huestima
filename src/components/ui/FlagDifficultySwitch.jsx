import { FLAG_DIFFICULTY_OPTIONS } from "@/lib/flags";

export default function FlagDifficultySwitch({ value, onChange, disabled = false }) {
  return (
    <div className="flag-difficulty-switch grid min-w-0 grid-cols-4 overflow-hidden rounded-full border border-black/10 bg-white/8 p-1">
      {FLAG_DIFFICULTY_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(option.id)}
          className={`min-w-0 rounded-full px-2 py-2 text-[0.62rem] font-bold uppercase tracking-[0.08em] transition-colors sm:text-[0.68rem] ${
            value === option.id ? "bg-white text-zinc-950" : "text-white/60 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
