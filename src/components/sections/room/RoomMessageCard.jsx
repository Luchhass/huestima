"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useLanguage";

export default function RoomMessageCard({ title, message }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-black p-6 text-white sm:p-8">
      <div className="max-w-92">
        <h1 className="text-5xl font-semibold lowercase leading-[0.9] tracking-normal text-white sm:text-[4.25rem]">
          {title}
        </h1>
        <p className="mt-5 text-[0.98rem] font-medium leading-tight text-white/82 sm:text-base">
          {message}
        </p>
      </div>

      <Link
        href="/"
        className="rgb-hover-button card-action-height mt-auto inline-flex w-full items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="relative z-10">{t("common.backHome")}</span>
      </Link>
    </div>
  );
}
