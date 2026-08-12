"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

const ICONS = {
  success: Check,
  error: X,
};

const STYLES = {
  success: "bg-emerald-500 text-white shadow-[0_18px_42px_rgba(16,185,129,0.28)]",
  error: "bg-red-500 text-white shadow-[0_18px_42px_rgba(239,68,68,0.3)]",
};

export default function PushNotification({
  notification,
  onClose,
  durationMs,
}) {
  const timeoutDurationMs = durationMs ?? 3000;

  useEffect(() => {
    if (!notification) return undefined;

    const timeoutId = window.setTimeout(() => {
      onClose?.();
    }, timeoutDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [notification, onClose, timeoutDurationMs]);

  if (typeof document === "undefined" || !notification) return null;

  const Icon = ICONS[notification.variant] || Check;
  const style = STYLES[notification.variant] || STYLES.success;

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 right-6 z-[240] max-w-[calc(100vw-2rem)]">
      <div
        key={notification.id}
        className={`pointer-events-auto relative flex min-h-14 max-w-[26rem] animate-[toast-slide-in_220ms_ease-out] items-center gap-3 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold leading-tight ${style}`}
        role={notification.variant === "error" ? "alert" : "status"}
      >
        <span className="grid size-7 shrink-0 place-items-center">
          <Icon size={17} strokeWidth={2.55} />
        </span>
        <span className="min-w-0">{notification.message}</span>
        <span
          className="pointer-events-none absolute bottom-0 left-0 h-[3px] bg-white/70"
          style={{
            width: "100%",
            transformOrigin: "left center",
            animation: `toast-timer ${timeoutDurationMs}ms linear forwards`,
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
