"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";

export default function AnnouncementModal({ message, onClose }) {
  const { t } = useTranslation();
  if (typeof document === "undefined" || !message) return null;

  return createPortal(
    <div className="fixed inset-0 z-[250] grid place-items-center bg-white p-6" role="alertdialog" aria-modal="true">
      <div className="announcement-modal relative w-full max-w-[27rem] rounded-[28px] bg-black px-7 py-8 text-white shadow-[var(--app-card-shadow)] sm:px-8 sm:py-9">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("notifications.close")}
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:top-6"
        >
          <X className="size-6" strokeWidth={1.8} />
        </button>
        <h2 className="text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-[0.94] tracking-[-0.055em]">{t("admin.operations.announcementTitle")}</h2>
        <p className="mt-5 max-w-[27rem] text-[1.05rem] font-medium leading-[1.4] text-white/68">{message}</p>
        <button type="button" onClick={onClose} className="rgb-hover-button card-action-height mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-5 text-base font-semibold text-zinc-950">
          <span className="relative z-10">{t("admin.common.ok")}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
