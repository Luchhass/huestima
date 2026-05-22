"use client";

import GameCardShell from "@/components/ui/game/GameCardShell";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";

export default function RoomCardShell({ children }) {
  useAppChromeHidden(true);

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <GameCardShell color={null}>
        {children}
      </GameCardShell>
    </main>
  );
}
