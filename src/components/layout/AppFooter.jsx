"use client";

import { useTranslation } from "@/hooks/useLanguage";

export default function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="creator-tag pointer-events-none fixed bottom-6 left-6 z-40 text-[11px] font-medium tracking-wider text-zinc-500 dark:text-zinc-500 sm:bottom-8 sm:left-8">
      {t("app.createdBy")}{" "}
      <a
        href="https://furkancosar.com"
        aria-label="Visit furkancosar.com"
        data-sound="off"
        className="creator-link pointer-events-auto relative inline-block text-inherit no-underline outline-none"
      >
        furkancosar
      </a>
    </footer>
  );
}
