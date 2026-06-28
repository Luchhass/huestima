"use client";

import { useEffect } from "react";
import { MUSIC_SCENES, pauseMusic, setMusicScene } from "@/lib/music";

export { MUSIC_SCENES };

export function useMusicScene(scene = MUSIC_SCENES.MENU) {
  useEffect(() => {
    if (!scene) return;

    if (scene === "silent") {
      pauseMusic();
      return;
    }

    setMusicScene(scene);
  }, [scene]);
}
