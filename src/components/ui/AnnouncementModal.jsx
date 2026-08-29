"use client";

import { createPortal } from "react-dom";
import { useTranslation } from "@/hooks/useLanguage";

export default function AnnouncementModal({ message, onClose }) {
  const { t } = useTranslation();
  if (typeof document === "undefined" || !message) return null;

  return createPortal(
    <div className="announcement-modal-backdrop fixed inset-0 z-[250] grid place-items-center bg-black/35 p-6 backdrop-blur-[2px]" role="alertdialog" aria-modal="true">
      <div className="announcement-modal w-full max-w-[30rem] rounded-[26px] bg-black p-6 text-white shadow-[var(--app-card-shadow)] sm:p-8">
        <h2 className="text-[clamp(1.8rem,5vw,2.5rem)] font-semibold leading-[0.94] tracking-[-0.045em]">{t("admin.operations.announcementTitle")}</h2>
        <p className="mt-5 text-base font-medium leading-[1.35] text-white/82 sm:text-lg">{message}</p>
        <button type="button" onClick={onClose} className="rgb-hover-button card-action-height mt-7 inline-flex w-full items-center justify-center rounded-full bg-white px-5 text-[0.95rem] font-semibold text-zinc-950 sm:text-base">
          <span className="relative z-10">{t("admin.common.ok")}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
