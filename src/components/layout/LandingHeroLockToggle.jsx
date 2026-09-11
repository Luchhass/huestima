"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";

const HERO_LOCK_ATTRIBUTE = "landingHeroLocked";

function applyHeroLock(locked) {
  if (locked) {
    const landingPage = document.querySelector(".landing-page");
    if (landingPage) landingPage.scrollTop = 0;
    document.documentElement.dataset[HERO_LOCK_ATTRIBUTE] = "true";
    return;
  }

  delete document.documentElement.dataset[HERO_LOCK_ATTRIBUTE];
}

export default function LandingHeroLockToggle() {
  const { locale } = useTranslation();
  const [locked, setLocked] = useState(false);
  const label = locked
    ? locale === "tr" ? "Hero kilidini aç" : "Unlock hero"
    : locale === "tr" ? "Hero alanını kilitle" : "Lock hero area";
  const Icon = locked ? Unlock : Lock;

  useEffect(() => () => applyHeroLock(false), []);

  const toggleLock = () => {
    const nextLocked = !locked;
    applyHeroLock(nextLocked);
    setLocked(nextLocked);
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={locked}
      title={label}
      onClick={toggleLock}
      className={`landing-hero-lock-toggle grid size-11 shrink-0 place-items-center rounded-full text-zinc-950 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 ${
        locked
          ? "bg-current/10"
          : "hover:scale-[1.04] hover:opacity-70 active:scale-[0.96]"
      }`}
    >
      <span className="sr-only">{label}</span>
      <Icon className="size-6" strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}
