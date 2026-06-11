"use client";

import { useState } from "react";
import { LockKeyhole, X } from "lucide-react";

const ADMIN_PASSWORD = "1811";

export default function AdminProtectorCard({ onCancel, onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (password.trim() !== ADMIN_PASSWORD) {
      setError("Wrong password.");
      return;
    }

    setError("");
    onUnlock();
  };

  return (
    <form className="relative flex h-full flex-col" onSubmit={handleSubmit}>
      {onCancel && (
        <button
          type="button"
          aria-label="Close admin mode"
          onClick={onCancel}
          className="solo-close-button absolute right-0 top-0 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:size-9"
        >
          <X className="size-6 sm:size-[26px]" strokeWidth={1.7} />
        </button>
      )}

      <div data-screen-reveal className="max-w-[23.5rem] pr-10">
        <h1 className="text-[clamp(2.5rem,11vw,4.2rem)] font-semibold lowercase leading-[0.88] tracking-normal text-white">
          admin
        </h1>

        <p className="mt-4 text-[0.95rem] font-medium leading-[1.22] text-white/82 sm:text-base">
          Welcome back. Enter your passcode to unlock your private controls.
        </p>
      </div>

      <div data-screen-reveal className="mt-auto w-full">
        <div className="grid w-full grid-cols-2 items-center gap-3">
          <div className="relative min-w-0">
            <span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-white/34">
              <LockKeyhole className="size-4" strokeWidth={2.25} />
            </span>

            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Admin password"
              placeholder="Password"
              className="card-control-frame card-action-height w-full appearance-none px-12 text-base font-semibold text-white outline-none transition placeholder:text-white/34 focus:ring-2 focus:ring-white/18"
            />
          </div>

          <button
            type="submit"
            className={`card-action-height inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full px-5 text-center text-sm font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-base ${
              error
                ? "bg-red-500 text-white shadow-[0_16px_30px_rgba(239,68,68,0.22)]"
                : "rgb-hover-button bg-white text-zinc-950"
            }`}
          >
            {error && <X className="relative z-10 size-4 shrink-0" strokeWidth={2.35} />}
            <span className="relative z-10 whitespace-nowrap">
              {error || "Enter mode"}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}
