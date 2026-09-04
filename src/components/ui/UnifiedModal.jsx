"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const EXIT_DURATION_MS = 900;

export default function UnifiedModal({
  open,
  title,
  description,
  closeLabel = "Close",
  cancelLabel,
  confirmLabel,
  onClose,
  onConfirm,
  singleAction = false,
  role = "dialog",
}) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // The modal must stay mounted while its enter/exit animation runs.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRendered(true);
      const frameId = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    setVisible(false);
    if (!rendered) return undefined;
    const timeoutId = window.setTimeout(() => setRendered(false), EXIT_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open, rendered]);

  useEffect(() => {
    if (!rendered) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, rendered]);

  if (typeof document === "undefined" || !rendered) return null;

  const handleConfirm = () => {
    if (singleAction) {
      onConfirm?.();
      return;
    }

    onClose?.();
    window.setTimeout(() => onConfirm?.(), EXIT_DURATION_MS);
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[260] grid place-items-center overflow-hidden p-6 transition-opacity duration-[420ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${visible ? "pointer-events-auto opacity-100 delay-0" : "pointer-events-none opacity-0 delay-[460ms]"}`}
      role={role}
      aria-modal="true"
      aria-labelledby="unified-modal-title"
    >
      <div className="absolute inset-0 bg-white/[0.8]" aria-hidden="true" />
      <section
        className={`relative z-10 w-full max-w-[27rem] origin-center rounded-[28px] bg-black px-7 py-8 text-white shadow-[var(--app-card-shadow)] transition-transform duration-[460ms] ease-[cubic-bezier(0.65,0,0.35,1)] sm:px-8 sm:py-9 ${visible ? "translate-y-0 scale-100 delay-[280ms]" : "translate-y-10 scale-0 delay-0"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:top-6"
        >
          <X className="size-6" strokeWidth={1.8} />
        </button>

        <div className="max-w-[20rem] pr-8">
          <h2 id="unified-modal-title" className="text-[clamp(1.65rem,5vw,2.15rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 text-[0.95rem] font-medium leading-[1.4] text-white/68 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {!singleAction ? (
            <button
              type="button"
              onClick={onClose}
              className="app-secondary-action card-action-height inline-flex items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-base"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleConfirm}
            className={`rgb-hover-button card-action-height inline-flex items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-base ${singleAction ? "col-start-2" : ""}`}
          >
            <span className="relative z-10">{confirmLabel}</span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
