import gsap from "gsap";

const LEVEL_IMPACT_PRESETS = [
  { strength: 0.18, spread: 0.9, rise: 0.26, fade: 0.72, recoil: 2.4 },
  { strength: 0.27, spread: 0.93, rise: 0.28, fade: 0.88, recoil: 3.1 },
  { strength: 0.37, spread: 0.96, rise: 0.3, fade: 1.04, recoil: 3.9 },
  { strength: 0.49, spread: 0.99, rise: 0.32, fade: 1.22, recoil: 4.8 },
  { strength: 0.63, spread: 1.02, rise: 0.34, fade: 1.44, recoil: 5.8 },
];

export function getLevelCountImpactPreset(index = 0) {
  const safeIndex = Math.min(Math.max(index, 0), LEVEL_IMPACT_PRESETS.length - 1);
  return LEVEL_IMPACT_PRESETS[safeIndex];
}

export function playLevelCountRecoil(card, index = 0) {
  if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const picker = card.querySelector(".level-count-picker");
  if (!picker) return;

  const preset = getLevelCountImpactPreset(index);
  const pickerRect = picker.getBoundingClientRect();
  const sourceX = pickerRect.left + pickerRect.width / 2;
  const sourceY = pickerRect.top + pickerRect.height / 2;
  const targets = Array.from(card.querySelectorAll("[data-game-mode-shock-target]"))
    .filter((target) => !target.querySelector(".level-count-picker"));

  targets.forEach((target, targetIndex) => {
    const rect = target.getBoundingClientRect();
    const dx = sourceX - (rect.left + rect.width / 2);
    const dy = sourceY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy) || 1;
    const ux = dx / distance;
    const uy = dy / distance;
    const response = target.dataset.gameModeShockWeight === "strong" ? 1.14 : 1;
    const push = preset.recoil * response;

    gsap.killTweensOf(target);
    gsap.timeline({ delay: targetIndex * 0.004 })
      .to(target, {
        x: ux * push,
        y: uy * push,
        duration: 0.085 + index * 0.004,
        ease: "power3.in",
        overwrite: true,
      })
      .to(target, {
        x: -ux * push * 0.38,
        y: -uy * push * 0.38,
        duration: 0.105 + index * 0.005,
        ease: "power2.out",
      })
      .to(target, {
        x: ux * push * 0.14,
        y: uy * push * 0.14,
        duration: 0.09,
        ease: "sine.inOut",
      })
      .to(target, {
        x: 0,
        y: 0,
        duration: 0.2 + index * 0.012,
        ease: "power3.out",
        clearProps: "transform",
      });
  });
}
