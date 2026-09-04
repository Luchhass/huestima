"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import gsap from "gsap";
import PushNotification from "@/components/ui/PushNotification";
import ModeSelector from "./ModeSelector";
import MultiplayerCard from "./MultiplayerCard";
import SingleplayerCard from "./SingleplayerCard";
import CartoonPoolPicker from "@/components/ui/CartoonPoolPicker";
import FlagPoolPicker from "@/components/ui/FlagPoolPicker";
import TeamPoolPicker from "@/components/ui/TeamPoolPicker";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useCartoonAssetPreload } from "@/hooks/useCartoonAssetPreload";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { clearAllGameSessions } from "@/hooks/useGameSession";
import { MUSIC_SCENES, useMusicScene } from "@/hooks/useMusicScene";
import { useTranslation } from "@/hooks/useLanguage";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { useSiteOperations } from "@/hooks/useSiteOperations";
import {
  playScreenFadeOut,
  SCREEN_FADE_OUT_EVENT,
  SCREEN_REVEAL_REPLAY_EVENT,
  SCREEN_REVEAL_START_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import {
  clearAdminHomeReturn,
  clearDownloadReturn,
  clearFooterReturn,
  hasPendingAdminHomeReturn,
  hasPendingDownloadReturn,
  hasPendingFooterReturn,
  playAdminHomeReturnEntry,
  playFooterReturnEntry,
} from "@/hooks/useFooterPageTransition";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_ROUND_COUNT,
  DIFFICULTY_IDS,
  GAME_MODE_IDS,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import {
  getDefaultGameModeForFamily,
  GAME_FAMILY_IDS,
  getGameFamilyHref,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import { getAvailableGameModeOptions } from "@/lib/gameMode";
import { FLAG_DIFFICULTY_OPTIONS } from "@/lib/flags";
import { CARTOON_PACKS } from "@/lib/cartoons";
import { TEAM_OPTIONS } from "@/lib/teams";
import { playSoundFile, preloadSoundFile } from "@/lib/sound";
import {
  getLevelCountImpactPreset,
  playLevelCountRecoil,
} from "@/lib/levelCountFeedback";

const DIFFICULTY_BURST_COLORS = {
  [DIFFICULTY_IDS.EASY]: {
    color: "#31e981",
    rgb: "49 233 129",
  },
  [DIFFICULTY_IDS.NORMAL]: {
    color: "#ffbd2f",
    rgb: "255 189 47",
  },
  [DIFFICULTY_IDS.HARD]: {
    color: "#ff3f46",
    rgb: "255 63 70",
  },
};
const CARD_RESIZE_DURATION_MS = 700;
const DIFFICULTY_BURST_LIFETIME_MS = 1180;
const CARTOON_TRANSFORM_DURATION_MS = 2300;
const CARTOON_TIMEOUT_DURATION_MS = 4500;
const CARTOON_TRANSFORM_SOUND = "/audio/omnitrix-transform.mp3";
const CARTOON_RETURN_SOUND = "/audio/omnitrix-time-out.mp3";
const CARTOON_CHARACTER_ALPHA_THRESHOLD = 16;
const cartoonCharacterHitMasks = new WeakMap();
const CARTOON_EASTER_EGG_CHARACTERS = [
  { id: "ben", src: "/game-modes/cartoon/ben-10/ben-home-character-new.png", width: 600, height: 1400, imageClassName: "cartoon-home-character--ben" },
  { id: "heatblast", src: "/game-modes/cartoon/ben-10/heatblast-home-character.png", width: 472, height: 1244, imageClassName: "cartoon-home-character--heatblast" },
  { id: "wildmutt", src: "/game-modes/cartoon/ben-10/wildmutt-home-character.png", width: 1024, height: 723, imageClassName: "cartoon-home-character--wildmutt" },
  { id: "cannonbolt", src: "/game-modes/cartoon/ben-10/cannonbolt-home-character.png", width: 1024, height: 944, imageClassName: "cartoon-home-character--cannonbolt" },
  { id: "diamondhead", src: "/game-modes/cartoon/ben-10/diamondhead-home-character.png", width: 688, height: 1554, imageClassName: "cartoon-home-character--diamondhead" },
  { id: "xlr8", src: "/game-modes/cartoon/ben-10/xlr8-home-character-new.png", width: 1024, height: 1024, imageClassName: "cartoon-home-character--xlr8" },
  { id: "fourArms", src: "/game-modes/cartoon/ben-10/four-arms-home-character-new.png", width: 875, height: 1387, imageClassName: "cartoon-home-character--four-arms" },
  { id: "stinkfly", src: "/game-modes/cartoon/ben-10/stinkfly-home-character.png", width: 559, height: 759, imageClassName: "cartoon-home-character--stinkfly" },
  { id: "upgrade", src: "/game-modes/cartoon/ben-10/upgrade-home-character.png", width: 896, height: 1310, imageClassName: "cartoon-home-character--upgrade" },
  { id: "wildvine", src: "/game-modes/cartoon/ben-10/wildvine-home-character.png", width: 685, height: 1200, imageClassName: "cartoon-home-character--wildvine" },
  { id: "upchuck", src: "/game-modes/cartoon/ben-10/upchuck-home-character.webp", width: 335, height: 473, imageClassName: "cartoon-home-character--upchuck" },
  { id: "ghostfreak", src: "/game-modes/cartoon/ben-10/ghostfreak-home-character.webp", width: 894, height: 1343, imageClassName: "cartoon-home-character--ghostfreak" },
  { id: "ripjaws", src: "/game-modes/cartoon/ben-10/ripjaws-home-character.webp", width: 576, height: 1280, imageClassName: "cartoon-home-character--ripjaws" },
];

function isOpaqueCartoonCharacterPixel(image, clientX, clientY) {
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return false;

  const bounds = image.getBoundingClientRect();
  if (
    clientX < bounds.left || clientX >= bounds.right ||
    clientY < bounds.top || clientY >= bounds.bottom
  ) {
    return false;
  }

  let mask = cartoonCharacterHitMasks.get(image);

  if (!mask) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;

    context.drawImage(image, 0, 0);
    mask = { context, width: canvas.width, height: canvas.height };
    cartoonCharacterHitMasks.set(image, mask);
  }

  const x = Math.min(mask.width - 1, Math.floor(((clientX - bounds.left) / bounds.width) * mask.width));
  const y = Math.min(mask.height - 1, Math.floor(((clientY - bounds.top) / bounds.height) * mask.height));

  try {
    return mask.context.getImageData(x, y, 1, 1).data[3] > CARTOON_CHARACTER_ALPHA_THRESHOLD;
  } catch {
    return false;
  }
}
const GAME_MODE_LOCKED_DIFFICULTIES = GAME_MODE_OPTIONS.reduce((locks, option) => {
  if (option.lockedDifficultyId) {
    locks[option.id] = option.lockedDifficultyId;
  }

  return locks;
}, {});

function waitForCardResize() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, CARD_RESIZE_DURATION_MS);
  });
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function getDifficultyBurstGeometry(card, origin, optionIndex) {
  const rect = card?.getBoundingClientRect();
  if (!rect) return { x: "50%", y: "78%", radius: "680px" };

  const fallbackX = rect.width * (0.18 + optionIndex * 0.16);
  const rawX = origin ? origin.clientX - rect.left : fallbackX;
  const rawY = origin ? origin.clientY - rect.top : rect.height * 0.78;
  const x = Math.max(0, Math.min(rect.width, rawX));
  const y = Math.max(0, Math.min(rect.height, rawY));
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));

  return { x: `${x}px`, y: `${y}px`, radius: `${radius}px` };
}

function playDifficultyRecoil(card, origin, optionIndex) {
  if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cardRect = card.getBoundingClientRect();
  const source = origin || {
    clientX: cardRect.left + cardRect.width * (0.18 + optionIndex * 0.16),
    clientY: cardRect.top + cardRect.height * 0.78,
  };
  const strength = [7.5, 11, 15.5][optionIndex] || 11;
  const shake = [2.1, 3.1, 4.4][optionIndex] || 3.1;
  const targets = Array.from(card.querySelectorAll("[data-game-mode-shock-target]"))
    .filter((target) => !target.querySelector(".difficulty-switch"));

  targets.forEach((target, targetIndex) => {
    const response = target.dataset.gameModeShockWeight === "strong" ? 1.42 : 1;
    const rect = target.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - source.clientX;
    const dy = rect.top + rect.height / 2 - source.clientY;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const px = -uy;
    const py = ux;

    gsap.killTweensOf(target);
    gsap.timeline({ delay: targetIndex * 0.006 })
      .to(target, {
        x: ux * strength * response,
        y: uy * strength * response,
        duration: 0.065 + optionIndex * 0.008,
        ease: "power3.out",
        overwrite: true,
      })
      .to(target, {
        x: ux * strength * 0.68 * response + px * shake * response,
        y: uy * strength * 0.68 * response + py * shake * response,
        duration: 0.052,
        ease: "power1.inOut",
      })
      .to(target, {
        x: ux * strength * 0.43 * response - px * shake * 0.82 * response,
        y: uy * strength * 0.43 * response - py * shake * 0.82 * response,
        duration: 0.048,
        ease: "none",
      })
      .to(target, {
        x: ux * strength * 0.2 * response + px * shake * 0.46 * response,
        y: uy * strength * 0.2 * response + py * shake * 0.46 * response,
        duration: 0.052,
        ease: "none",
      })
      .to(target, {
        x: 0,
        y: 0,
        duration: 0.17 + optionIndex * 0.022,
        ease: `back.out(${1.35 + optionIndex * 0.12})`,
        clearProps: "transform",
      });
  });
}

export default function HomeCard({
  initialView = "home",
  gameFamily = "color",
  initialDifficulty = null,
  initialGameMode = null,
  initialRoundCount = null,
  initialHintsEnabled = null,
  initialFlagDifficulty = null,
  initialFlagDifficulties = null,
  initialCartoonIds = null,
  initialTeamIds = null,
}) {
  const { locale, t } = useTranslation();
  const { operations, ready: operationsReady } = useSiteOperations();
  const multiplayerEnabled =
    operationsReady && operations.multiplayerEnabled;
  const cleanGameFamily = normalizeGameFamily(gameFamily);
  const defaultGameMode = getDefaultGameModeForFamily(cleanGameFamily);
  const defaultDifficulty =
    GAME_MODE_LOCKED_DIFFICULTIES[defaultGameMode] || DEFAULT_DIFFICULTY_ID;
  const singleplayerGameModeOptions = getAvailableGameModeOptions(
    GAME_MODE_OPTIONS.filter((option) => !option.multiplayerOnly),
    cleanGameFamily,
  );
  const [view, setView] = useState(initialView);
  const [difficulty, setDifficulty] = useState(initialDifficulty || defaultDifficulty);
  const [gameMode, setGameMode] = useState(initialGameMode || defaultGameMode);
  const [roundCount, setRoundCount] = useState(initialRoundCount || DEFAULT_ROUND_COUNT);
  const [flagDifficulty, setFlagDifficulty] = useState(initialFlagDifficulty || "starter");
  const [flagDifficulties, setFlagDifficulties] = useState(
    initialFlagDifficulties ?? (initialFlagDifficulty
      ? [initialFlagDifficulty]
      : ["starter"]),
  );
  const [cartoonIds, setCartoonIds] = useState(
    initialCartoonIds ?? CARTOON_PACKS.flatMap(({ itemIds }) => itemIds),
  );
  const [teamIds, setTeamIds] = useState(
    initialTeamIds ?? TEAM_OPTIONS.map(({ id }) => id),
  );
  const [cartoonPoolReturnView, setCartoonPoolReturnView] = useState("singleplayer");
  const [isMultiplayerTallStep, setIsMultiplayerTallStep] = useState(false);
  const [difficultyBursts, setDifficultyBursts] = useState([]);
  const [levelCountImpacts, setLevelCountImpacts] = useState([]);
  const [cartoonCharacterIndex, setCartoonCharacterIndex] = useState(0);
  const [cartoonBurst, setCartoonBurst] = useState(null);
  const [notification, setNotification] = useState(null);
  const [deferViewReveal, setDeferViewReveal] = useState(false);
  const [isStartingSingleplayer, setIsStartingSingleplayer] = useState(false);
  const contentRef = useRef(null);
  const cardRef = useRef(null);
  const stickerRef = useRef(null);
  const isFooterReturnRef = useRef(false);
  const [isAdminReturnPending] = useState(() => hasPendingAdminHomeReturn());
  const difficultyBurstTimersRef = useRef(new Map());
  const levelCountImpactTimersRef = useRef(new Map());
  const cartoonTransformTimersRef = useRef([]);
  const cartoonCharacterRef = useRef(null);
  const isChangingViewRef = useRef(false);

  const isSingleplayer = view === "singleplayer";
  const isMultiplayer = view === "multiplayer";
  const isCartoonPool = view === "cartoonPool";
  const isFlagPool = view === "flagPool";
  const isTeamPool = view === "teamPool";
  const isSingleplayerTallView =
    isSingleplayer ||
    ((isCartoonPool || isFlagPool || isTeamPool) &&
      cartoonPoolReturnView === "singleplayer");
  const isExpandedCard =
    !isStartingSingleplayer &&
    (isSingleplayerTallView || (isMultiplayer && isMultiplayerTallStep));
  const cardHeight = useResponsiveCardHeight(
    isExpandedCard || isCartoonPool || isFlagPool,
  );
  const cardStyle = cardHeight ? { height: cardHeight } : undefined;
  const homeSection = t(`home.sections.${cleanGameFamily}`);
  const homeTitle = homeSection?.title || t(`gameFamily.${cleanGameFamily}`);
  const homeParagraphs = Array.isArray(homeSection?.paragraphs)
    ? homeSection.paragraphs
    : t("home.paragraphs");

  if (typeof window !== "undefined") {
    isFooterReturnRef.current ||= hasPendingFooterReturn();
  }

  useAppChromeHidden(isSingleplayer || isMultiplayer || isCartoonPool || isFlagPool || isTeamPool);
  useCartoonAssetPreload(
    cleanGameFamily === GAME_FAMILY_IDS.CARTOON,
    undefined,
    "scene",
  );
  useFlagFullscreenLock(
    cleanGameFamily === GAME_FAMILY_IDS.FLAG ||
      cleanGameFamily === GAME_FAMILY_IDS.CARTOON ||
      gameMode === GAME_MODE_IDS.FLAG ||
      gameMode === GAME_MODE_IDS.CARTOON,
  );
  useMusicScene(
    cleanGameFamily === GAME_FAMILY_IDS.CARTOON
      ? MUSIC_SCENES.CARTOON_MENU
      : MUSIC_SCENES.MENU,
  );

  useEffect(() => {
    if (cleanGameFamily !== GAME_FAMILY_IDS.CARTOON) return;
    preloadSoundFile(CARTOON_TRANSFORM_SOUND);
    preloadSoundFile(CARTOON_RETURN_SOUND);
  }, [cleanGameFamily]);

  useEffect(() => {
    if (cleanGameFamily !== GAME_FAMILY_IDS.CARTOON || typeof window === "undefined") {
      return;
    }

    CARTOON_EASTER_EGG_CHARACTERS.forEach((character) => {
      const image = new window.Image();
      image.decoding = "async";
      image.fetchPriority = "high";
      image.src = character.src;
      const decodePromise = image.decode?.();
      if (decodePromise) void decodePromise.catch(() => {});
    });
  }, [cleanGameFamily]);

  useScreenReveal(
    contentRef,
    [view, cleanGameFamily, locale],
    {
      // Footer return state is intentionally read once to defer the entry reveal.
      // eslint-disable-next-line react-hooks/refs
      defer: isFooterReturnRef.current || isAdminReturnPending || deferViewReveal,
    },
  );

  useLayoutEffect(() => {
    const sticker = stickerRef.current;
    if (!sticker) return undefined;

    const brandPiecePresets = [
      { at: 0.02, duration: 0.56, y: 84, x: -6, scale: 0.93, ease: "back.out(1.18)" },
      { at: 0.12, duration: 0.67, y: 116, x: 5, scale: 0.89, ease: "power4.out" },
      { at: 0.18, duration: 0.53, y: 91, x: -4, scale: 0.96, ease: "back.out(1.12)" },
      { at: 0.28, duration: 0.71, y: 130, x: 7, scale: 0.9, ease: "power4.out" },
      { at: 0.35, duration: 0.57, y: 101, x: -6, scale: 0.94, ease: "back.out(1.16)" },
      { at: 0.46, duration: 0.69, y: 121, x: 4, scale: 0.91, ease: "power4.out" },
      { at: 0.54, duration: 0.6, y: 96, x: -3, scale: 0.96, ease: "back.out(1.1)" },
    ];

    let tween = null;

    const stopTween = () => {
      tween?.kill();
      tween = null;
    };

    const handleRevealStart = (event) => {
      if (view !== "home") return;

      stopTween();

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(sticker, { autoAlpha: 1, yPercent: 0 });
        gsap.set(sticker.children, { clearProps: "all" });
        return;
      }

      if (cleanGameFamily === GAME_FAMILY_IDS.BRAND) {
        const pieces = Array.from(sticker.children);
        gsap.set(sticker, { autoAlpha: 1, yPercent: 0 });
        tween = gsap.timeline();

        pieces.forEach((piece, index) => {
          const preset = brandPiecePresets[index % brandPiecePresets.length];
          tween.fromTo(
            piece,
            {
              autoAlpha: 0,
              x: preset.x,
              y: preset.y,
              scale: preset.scale,
            },
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration: preset.duration,
              ease: preset.ease,
              overwrite: true,
              clearProps: "transform,opacity,visibility",
            },
            preset.at,
          );
        });
        return;
      }

      if (cleanGameFamily === GAME_FAMILY_IDS.COLOR) {
        const colorWave = sticker.querySelector(".home-color-spectrum__shell");
        gsap.set(sticker, { autoAlpha: 1, yPercent: 0 });

        if (!colorWave) return;

        tween = gsap.fromTo(
          colorWave,
          { y: 500 },
          {
            y: 0,
            duration: event.detail?.duration ?? 0.9,
            ease: event.detail?.ease ?? "power4.out",
            overwrite: true,
            onComplete: () => gsap.set(colorWave, { clearProps: "transform" }),
          },
        );
        return;
      }

      tween = gsap.fromTo(
        sticker,
        { autoAlpha: 1, yPercent: 110 },
        {
          autoAlpha: 1,
          yPercent: 0,
          duration: event.detail?.duration ?? 0.9,
          ease: event.detail?.ease ?? "power4.out",
          overwrite: true,
        },
      );
    };

    const handleFadeOut = (event) => {
      if (view !== "home") return;

      stopTween();
      tween = gsap.to(sticker, {
        autoAlpha: 0,
        duration: event.detail?.duration ?? 0.24,
        ease: event.detail?.ease ?? "power2.out",
        overwrite: true,
      });
    };

    gsap.set(sticker, { autoAlpha: 0 });
    window.addEventListener(SCREEN_REVEAL_START_EVENT, handleRevealStart);
    window.addEventListener(SCREEN_FADE_OUT_EVENT, handleFadeOut);

    return () => {
      window.removeEventListener(SCREEN_REVEAL_START_EVENT, handleRevealStart);
      window.removeEventListener(SCREEN_FADE_OUT_EVENT, handleFadeOut);
      stopTween();
    };
  }, [cleanGameFamily, view]);

  useLayoutEffect(() => {
    if (!hasPendingAdminHomeReturn()) return undefined;

    const card = cardRef.current;
    if (!card) return undefined;

    let active = true;

    void playAdminHomeReturnEntry(card).then(() => {
      if (!active) return;

      clearAdminHomeReturn();
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    });

    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!hasPendingDownloadReturn()) return undefined;

    const card = cardRef.current;
    if (!card) return undefined;

    let active = true;

    void playFooterReturnEntry(card, { scaleCard: false }).then(() => {
      if (!active) return;

      clearDownloadReturn();
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    });

    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!hasPendingFooterReturn()) return undefined;

    const card = cardRef.current;
    if (!card) return undefined;

    let active = true;

    void playFooterReturnEntry(card).then(() => {
      if (!active) return;

      isFooterReturnRef.current = false;
      clearFooterReturn();
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    clearAllGameSessions();
  }, []);

  useEffect(() => {
    const difficultyBurstTimers = difficultyBurstTimersRef.current;
    const levelCountImpactTimers = levelCountImpactTimersRef.current;
    const cartoonTransformTimers = cartoonTransformTimersRef.current;
    return () => {
      difficultyBurstTimers.forEach((timerId) => window.clearTimeout(timerId));
      difficultyBurstTimers.clear();
      levelCountImpactTimers.forEach((timerId) => window.clearTimeout(timerId));
      levelCountImpactTimers.clear();
      cartoonTransformTimers.forEach((timerId) => window.clearTimeout(timerId));
      cartoonTransformTimers.length = 0;
    };
  }, []);

  const changeView = useCallback(async (nextView) => {
    if (nextView === view || isChangingViewRef.current) return;

    isChangingViewRef.current = true;
    await playScreenFadeOut(contentRef);

    let currentCardIsExpanded = isExpandedCard;
    if (isMultiplayer && isMultiplayerTallStep) {
      setIsMultiplayerTallStep(false);
      await waitForCardResize();
      currentCardIsExpanded = false;
    }

    const nextViewIsSingleplayerTall =
      nextView === "singleplayer" ||
      ((nextView === "cartoonPool" ||
        nextView === "flagPool" ||
        nextView === "teamPool") &&
        (view === "singleplayer" ||
          cartoonPoolReturnView === "singleplayer"));
    const cardWillResize = currentCardIsExpanded !== nextViewIsSingleplayerTall;

    setDeferViewReveal(true);
    setView(nextView);

    if (cardWillResize) {
      await waitForCardResize();
    } else {
      await waitForNextPaint();
    }

    window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    setDeferViewReveal(false);
    isChangingViewRef.current = false;
  }, [cartoonPoolReturnView, isExpandedCard, isMultiplayer, isMultiplayerTallStep, view]);

  useEffect(() => {
    const isMultiplayerOnlyView =
      isMultiplayer ||
      ((isCartoonPool || isFlagPool || isTeamPool) &&
        cartoonPoolReturnView === "multiplayer");

    if (!operationsReady || multiplayerEnabled || !isMultiplayerOnlyView) return;
    const redirectId = window.setTimeout(() => {
      void changeView("home");
    }, 0);

    return () => window.clearTimeout(redirectId);
  }, [
    changeView,
    isCartoonPool,
    isFlagPool,
    isMultiplayer,
    isTeamPool,
    multiplayerEnabled,
    operationsReady,
    cartoonPoolReturnView,
  ]);

  const openCartoonPool = async () => {
    if (view !== "singleplayer" && view !== "multiplayer") return;
    setCartoonPoolReturnView(view);
    await changeView("cartoonPool");
  };

  const openFlagPool = async () => {
    if (view !== "singleplayer" && view !== "multiplayer") return;
    setCartoonPoolReturnView(view);
    await changeView("flagPool");
  };
  const openTeamPool = async () => { if (view !== "singleplayer" && view !== "multiplayer") return; setCartoonPoolReturnView(view); await changeView("teamPool"); };

  const closeCartoonPool = async () => {
    await changeView(cartoonPoolReturnView);
  };

  const triggerDifficultyFeedback = (nextDifficulty, optionIndex = 1, origin = null) => {
    const burst =
      DIFFICULTY_BURST_COLORS[nextDifficulty] ||
      DIFFICULTY_BURST_COLORS[DIFFICULTY_IDS.NORMAL];

    const key = `${nextDifficulty}-${optionIndex}-${Date.now()}-${Math.random()}`;
    const geometry = getDifficultyBurstGeometry(cardRef.current, origin, optionIndex);
    const nextBurst = {
      id: nextDifficulty,
      color: burst.color,
      rgb: burst.rgb,
      key,
      ...geometry,
    };

    setDifficultyBursts((current) => [...current, nextBurst].slice(-6));
    playDifficultyRecoil(cardRef.current, origin, optionIndex);

    const timerId = window.setTimeout(() => {
      setDifficultyBursts((current) => current.filter((item) => item.key !== key));
      difficultyBurstTimersRef.current.delete(key);
    }, DIFFICULTY_BURST_LIFETIME_MS);
    difficultyBurstTimersRef.current.set(key, timerId);
  };

  const triggerLevelCountFeedback = ({ index = 0 }) => {
    if (!cardRef.current) return;
    const key = `level-${index}-${Date.now()}-${Math.random()}`;
    const preset = getLevelCountImpactPreset(index);
    const impact = {
      key,
      strength: preset.strength,
      spread: preset.spread,
      rise: `${preset.rise}s`,
      fade: `${preset.fade}s`,
    };

    levelCountImpactTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    levelCountImpactTimersRef.current.clear();
    setLevelCountImpacts([impact]);
    playLevelCountRecoil(cardRef.current, index);

    const timerId = window.setTimeout(() => {
      setLevelCountImpacts((current) => current.filter((item) => item.key !== key));
      levelCountImpactTimersRef.current.delete(key);
    }, (preset.rise + preset.fade) * 1000 + 120);
    levelCountImpactTimersRef.current.set(key, timerId);
  };

  const handleGameModeChange = (nextGameMode) => {
    setGameMode(nextGameMode);

    const lockedDifficulty = GAME_MODE_LOCKED_DIFFICULTIES[nextGameMode];

    if (lockedDifficulty && difficulty !== lockedDifficulty) {
      setDifficulty(lockedDifficulty);
      triggerDifficultyFeedback(lockedDifficulty, 0);
    }
  };

  const handleDifficultyChange = (nextDifficulty) => {
    if (GAME_MODE_LOCKED_DIFFICULTIES[gameMode]) return;

    setDifficulty(nextDifficulty);
  };

  const prepareSingleplayerLaunch = async () => {
    const closeButton = cardRef.current?.querySelector(".solo-close-button");

    await Promise.all([
      playScreenFadeOut(contentRef, { duration: 0.28 }),
      closeButton
        ? playScreenFadeOut(closeButton, { duration: 0.28 })
        : Promise.resolve(),
    ]);

    setIsStartingSingleplayer(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, CARD_RESIZE_DURATION_MS);
    });
  };

  const triggerCartoonTransformation = () => {
    if (cartoonBurst || view !== "home") return;

    const returningToBen = cartoonCharacterIndex !== 0;
    const nextCharacterIndex = returningToBen
      ? 0
      : 1 + Math.floor(Math.random() * (CARTOON_EASTER_EGG_CHARACTERS.length - 1));
    const color = returningToBen ? "red" : "green";
    const burstKey = `${color}-${Date.now()}`;
    const cardBounds = cardRef.current?.getBoundingClientRect();
    const characterBounds = cartoonCharacterRef.current?.getBoundingClientRect();
    let burstX = 73;
    let burstY = 55;

    if (cardBounds && characterBounds) {
      const anchorX = returningToBen ? 0.5 : 0.335;
      const anchorY = returningToBen ? 0.42 : 0.36;
      burstX = ((characterBounds.left + characterBounds.width * anchorX - cardBounds.left) / cardBounds.width) * 100;
      burstY = ((characterBounds.top + characterBounds.height * anchorY - cardBounds.top) / cardBounds.height) * 100;
    }

    playSoundFile(returningToBen ? CARTOON_RETURN_SOUND : CARTOON_TRANSFORM_SOUND, {
      volume: returningToBen ? 0.78 : 0.82,
      playbackRate: 1,
      startAt: returningToBen ? 0.05 : 0.52,
    });

    cartoonTransformTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    cartoonTransformTimersRef.current.length = 0;
    setCartoonBurst({
      key: burstKey,
      color,
      mode: returningToBen ? "timeout" : "transform",
      x: burstX,
      y: burstY,
    });

    const characterSwapDelay = returningToBen ? 3330 : 430;
    const burstDuration = returningToBen
      ? CARTOON_TIMEOUT_DURATION_MS
      : CARTOON_TRANSFORM_DURATION_MS;

    cartoonTransformTimersRef.current.push(
      window.setTimeout(() => {
        setCartoonCharacterIndex(nextCharacterIndex);
      }, characterSwapDelay),
      window.setTimeout(() => {
        setCartoonBurst(null);
        cartoonTransformTimersRef.current.length = 0;
      }, burstDuration),
    );
  };

  const cartoonCharacterConfig =
    CARTOON_EASTER_EGG_CHARACTERS[cartoonCharacterIndex];

  const handleCartoonCharacterClick = (event) => {
    if (
      cleanGameFamily !== GAME_FAMILY_IDS.CARTOON ||
      view !== "home" ||
      cartoonBurst ||
      !isOpaqueCartoonCharacterPixel(
        cartoonCharacterRef.current,
        event.clientX,
        event.clientY,
      )
    ) {
      return;
    }

    triggerCartoonTransformation();
  };

  const handleCartoonCharacterKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    triggerCartoonTransformation();
  };

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        data-intro-card-target
        ref={cardRef}
        onClick={handleCartoonCharacterClick}
      className="home-card relative isolate flex w-full max-w-125 flex-col overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[var(--app-card-shadow)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] sm:rounded-[26px] sm:p-8"
        style={cardStyle}
      >
        <PushNotification
          notification={notification}
          onClose={() => setNotification(null)}
        />

        {difficultyBursts.map((difficultyBurst) => (
          <span
            key={difficultyBurst.key}
            className={`difficulty-burst difficulty-burst--${difficultyBurst.id}`}
            style={{
              "--difficulty-burst-color": difficultyBurst.color,
              "--difficulty-burst-rgb": difficultyBurst.rgb,
              "--difficulty-burst-x": difficultyBurst.x,
              "--difficulty-burst-y": difficultyBurst.y,
              "--difficulty-burst-radius": difficultyBurst.radius,
            }}
            aria-hidden="true"
          >
            <span className="difficulty-burst__wave" />
          </span>
        ))}

        {levelCountImpacts.map((impact) => (
          <span
            key={impact.key}
            aria-hidden="true"
            className="level-card-impact"
            style={{
              "--level-card-impact-strength": impact.strength,
              "--level-card-impact-spread": impact.spread,
              "--level-card-impact-rise": impact.rise,
              "--level-card-impact-fade": impact.fade,
            }}
          >
            <span className="level-card-impact__field" />
            <span className="level-card-impact__pressure" />
          </span>
        ))}

        {cartoonBurst && (
          <span
            key={cartoonBurst.key}
            aria-hidden="true"
            className={`cartoon-transform-burst cartoon-transform-burst--${cartoonBurst.color} cartoon-transform-burst--${cartoonBurst.mode}`}
            style={{
              "--cartoon-burst-x": `${cartoonBurst.x}%`,
              "--cartoon-burst-y": `${cartoonBurst.y}%`,
            }}
          >
            <span className="cartoon-transform-burst__wash" />
            <span className="cartoon-transform-burst__rays cartoon-transform-burst__rays--wide" />
            <span className="cartoon-transform-burst__rays cartoon-transform-burst__rays--tight" />
            <span className="cartoon-transform-burst__ring" />
            <span className="cartoon-transform-burst__core" />
          </span>
        )}

        {(isSingleplayer || isMultiplayer) && (
          <button
            data-game-mode-shock-target
            type="button"
            aria-label={t("common.backHome")}
            onClick={() => changeView("home")}
            className="solo-close-button absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8 sm:top-8 sm:size-9"
          >
            <X className="size-6 sm:size-[26px]" strokeWidth={1.7} />
          </button>
        )}

        <div
          ref={contentRef}
          data-route-transition-scope
          className={`home-card-content home-card-content--${view} relative z-10 flex h-full flex-col`}
        >
          {view === "home" ? (
            <>
                  <div data-screen-reveal className="home-copy max-w-[23.5rem]">
                    <h1 className="text-5xl font-semibold leading-[0.9] tracking-normal text-white sm:text-[4.65rem]">
                      {homeTitle}
                    </h1>

                    {homeParagraphs.map((paragraph, index) => (
                      <p
                        key={paragraph}
                        className={`${
                          index === 0 ? "mt-5" : "mt-4"
                        } text-[0.95rem] font-medium leading-[1.22] text-white/82 sm:text-base`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div
                    data-screen-reveal
                    className="home-actions relative z-10 mt-auto self-start"
                  >
                    <ModeSelector
                      onSingleplayer={() => changeView("singleplayer")}
                      onMultiplayer={() =>
                        multiplayerEnabled && changeView("multiplayer")
                      }
                      multiplayerEnabled={multiplayerEnabled}
                    />
                  </div>

            </>
          ) : isCartoonPool ? (
            <CartoonPoolPicker
              value={cartoonIds}
              onChange={setCartoonIds}
              onDone={closeCartoonPool}
            />
          ) : isFlagPool ? (
            <FlagPoolPicker
              value={flagDifficulties}
              onChange={setFlagDifficulties}
              onDone={() => changeView(cartoonPoolReturnView)}
            />
          ) : isTeamPool ? (
            <TeamPoolPicker value={teamIds} onChange={setTeamIds} onDone={() => changeView(cartoonPoolReturnView)} />
          ) : isSingleplayer ? (
            <SingleplayerCard
              difficulty={difficulty}
              gameMode={gameMode}
              gameFamily={cleanGameFamily}
              gameModeOptions={singleplayerGameModeOptions}
              playPath={getGameFamilyHref(cleanGameFamily, "singleplayer")}
              roundCount={roundCount}
              hintsEnabled={initialHintsEnabled ?? true}
              flagDifficulty={flagDifficulty}
              onFlagDifficultyChange={setFlagDifficulty}
              flagDifficulties={flagDifficulties}
              onFlagDifficultiesChange={setFlagDifficulties}
              cartoonIds={cartoonIds}
              onCartoonIdsChange={setCartoonIds}
              onOpenCartoonPool={openCartoonPool}
              onOpenFlagPool={openFlagPool}
              teamIds={teamIds}
              onOpenTeamPool={openTeamPool}
              onDifficultyChange={handleDifficultyChange}
              onDifficultyFeedback={triggerDifficultyFeedback}
              onGameModeChange={handleGameModeChange}
              onRoundCountChange={setRoundCount}
              onRoundCountFeedback={triggerLevelCountFeedback}
              onBeforePlay={prepareSingleplayerLaunch}
            />
          ) : (
            <MultiplayerCard
              gameFamily={cleanGameFamily}
              onTallStepChange={setIsMultiplayerTallStep}
              initialDifficulty={initialDifficulty || defaultDifficulty}
              initialGameMode={initialGameMode || defaultGameMode}
              initialRoundCount={roundCount}
              initialHintsEnabled={initialHintsEnabled ?? true}
            />
          )}
        </div>

        {(cleanGameFamily === GAME_FAMILY_IDS.TEAM ||
          cleanGameFamily === GAME_FAMILY_IDS.CARTOON ||
          cleanGameFamily === GAME_FAMILY_IDS.BRAND ||
          cleanGameFamily === GAME_FAMILY_IDS.FLAG ||
          cleanGameFamily === GAME_FAMILY_IDS.COLOR) && (
          <div
            ref={stickerRef}
            aria-hidden="true"
            className={`team-home-sticker pointer-events-none absolute z-0 select-none opacity-0 will-change-[opacity,transform] ${
              cleanGameFamily === GAME_FAMILY_IDS.CARTOON
                ? "-bottom-[140px] right-[-52px] w-[268px] sm:-bottom-[170px] sm:right-[-44px] sm:w-[335px]"
                : cleanGameFamily === GAME_FAMILY_IDS.COLOR
                  ? "inset-0 h-full w-full"
                : cleanGameFamily === GAME_FAMILY_IDS.FLAG
                  ? "inset-0 h-full w-full"
                : cleanGameFamily === GAME_FAMILY_IDS.BRAND
                  ? "bottom-0 right-0 h-[280px] w-[300px] sm:h-[330px] sm:w-[350px]"
                  : "-bottom-8 right-4 w-40 sm:-bottom-12 sm:right-6 sm:w-56"
            }`}
          >
            {cleanGameFamily === GAME_FAMILY_IDS.COLOR ? (
              <svg
                viewBox="0 0 500 500"
                preserveAspectRatio="none"
                className={`home-color-spectrum absolute inset-0 size-full ${
                  view === "home" ? "home-color-spectrum--active" : ""
                }`}
                aria-hidden="true"
              >
                <defs>
                  <path
                    id="home-color-wave-shape"
                    d="M 90 520 C 100 474 112 438 148 428 C 186 418 207 399 232 370 C 260 337 285 307 319 315 C 356 325 379 338 410 312 C 441 286 450 251 476 237 C 494 228 510 238 525 251 L 525 525 L 90 525 Z"
                  >
                  </path>
                  <filter
                    id="home-color-wave-soften"
                    x="-32%"
                    y="-32%"
                    width="164%"
                    height="164%"
                  >
                    <feGaussianBlur stdDeviation="22" />
                  </filter>
                  <filter
                    id="home-color-spectrum-blend"
                    x="-18%"
                    y="-8%"
                    width="136%"
                    height="116%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feGaussianBlur stdDeviation="20 2" />
                  </filter>
                  <mask id="home-color-wave-mask" maskUnits="userSpaceOnUse">
                    <rect y="-30" width="500" height="560" fill="black" />
                    <use
                      href="#home-color-wave-shape"
                      fill="white"
                      filter="url(#home-color-wave-soften)"
                    />
                  </mask>
                  <linearGradient
                    id="home-color-rgb-spectrum"
                    x1="0"
                    y1="0"
                    x2="500"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                    spreadMethod="repeat"
                    colorInterpolation="sRGB"
                  >
                    <stop offset="0" stopColor="#ff5f7a" />
                    <stop offset="0.2" stopColor="#f7d046" />
                    <stop offset="0.4" stopColor="#32d989" />
                    <stop offset="0.6" stopColor="#45a6ff" />
                    <stop offset="0.8" stopColor="#9d6cff" />
                    <stop offset="1" stopColor="#ff5f7a" />
                  </linearGradient>
                </defs>
                <g
                  className="home-color-spectrum__shell"
                  filter="url(#home-color-spectrum-blend)"
                  mask="url(#home-color-wave-mask)"
                >
                  <rect
                    className="home-color-spectrum__track"
                    x="-500"
                    y="-30"
                    width="1500"
                    height="560"
                    fill="url(#home-color-rgb-spectrum)"
                  />
                </g>
              </svg>
            ) : cleanGameFamily === GAME_FAMILY_IDS.FLAG ? (
              <>
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 118% 108% at 102% 104%, rgba(227,10,23,1) 0%, rgba(227,10,23,0.94) 32%, rgba(227,10,23,0.68) 54%, rgba(227,10,23,0.34) 72%, rgba(227,10,23,0.1) 86%, rgba(227,10,23,0) 96%)",
                  }}
                />
                <Image
                  src="/game-modes/flag/decorative/turkey-crescent-star.png"
                  alt=""
                  width={1413}
                  height={1064}
                  sizes="(max-width: 640px) 230px, 290px"
                  className="absolute -bottom-12 -right-9 w-[230px] max-w-none sm:-bottom-16 sm:-right-10 sm:w-[290px]"
                  priority
                />
              </>
            ) : cleanGameFamily === GAME_FAMILY_IDS.BRAND ? (
              <>
                <Image
                  src="/game-modes/brand/brand-logos/google-chrome.png"
                  alt=""
                  width={1024}
                  height={1024}
                  sizes="(max-width: 640px) 72px, 86px"
                  className="absolute bottom-16 right-[120px] w-[72px] -rotate-[17deg] drop-shadow-[0_11px_16px_rgba(0,0,0,0.42)] sm:bottom-[76px] sm:right-[142px] sm:w-[86px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/spotify.png"
                  alt=""
                  width={739}
                  height={709}
                  sizes="(max-width: 640px) 72px, 86px"
                  className="absolute bottom-12 right-[62px] z-20 w-[72px] rotate-[10deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-14 sm:right-[76px] sm:w-[86px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/snapchat.png"
                  alt=""
                  width={1500}
                  height={1500}
                  sizes="(max-width: 640px) 68px, 82px"
                  className="absolute bottom-[105px] right-8 z-20 w-[68px] rotate-[18deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-[120px] sm:right-9 sm:w-[82px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/discord.png"
                  alt=""
                  width={900}
                  height={900}
                  sizes="(max-width: 640px) 92px, 112px"
                  className="absolute -bottom-1 right-[135px] w-[92px] -rotate-[13deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:-bottom-1 sm:right-[158px] sm:w-28"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/netflix.png"
                  alt=""
                  width={4096}
                  height={4096}
                  sizes="(max-width: 640px) 84px, 102px"
                  className="absolute bottom-9 -right-2 z-10 w-[84px] -rotate-[8deg] drop-shadow-[0_12px_17px_rgba(0,0,0,0.42)] sm:bottom-11 sm:-right-1.5 sm:w-[102px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/instagram.png"
                  alt=""
                  width={4096}
                  height={4096}
                  sizes="(max-width: 640px) 82px, 102px"
                  className="absolute bottom-[166px] -right-1 w-[82px] -rotate-[14deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:bottom-[188px] sm:right-0 sm:w-[102px]"
                  priority
                />
                <Image
                  src="/game-modes/brand/brand-logos/facebook.png"
                  alt=""
                  width={400}
                  height={400}
                  sizes="(max-width: 640px) 168px, 202px"
                  className="absolute -bottom-[60px] -right-8 w-[168px] rotate-[7deg] drop-shadow-[0_13px_18px_rgba(0,0,0,0.42)] sm:-bottom-[72px] sm:-right-9 sm:w-[202px]"
                  priority
                />
              </>
            ) : cleanGameFamily === GAME_FAMILY_IDS.CARTOON ? (
              <>
                <Image
                  ref={cartoonCharacterRef}
                  key={cartoonCharacterConfig.id}
                  src={cartoonCharacterConfig.src}
                  alt=""
                  width={cartoonCharacterConfig.width}
                  height={cartoonCharacterConfig.height}
                  sizes="(max-width: 640px) 268px, 335px"
                  className={`cartoon-home-character ${cartoonCharacterConfig.imageClassName}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Ben 10 easter egg"
                  aria-disabled={Boolean(cartoonBurst)}
                  onKeyDown={handleCartoonCharacterKeyDown}
                  priority
                />
                <div className="cartoon-home-character-preload" aria-hidden="true">
                  {CARTOON_EASTER_EGG_CHARACTERS.map((character) => (
                    <Image
                      key={character.id}
                      src={character.src}
                      alt=""
                      width={1}
                      height={1}
                      sizes="1px"
                      loading="eager"
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <Image
                  src="/game-modes/team/team-logos/fenerbahce.png"
                  alt=""
                  width={3000}
                  height={3000}
                  sizes="(max-width: 640px) 160px, 224px"
                  className="relative z-10 h-auto w-full -rotate-[8deg] drop-shadow-[0_14px_24px_rgba(0,0,0,0.38)]"
                  priority
                />
                <Image
                  src="/game-modes/team/team-logos/galatasaray.png"
                  alt=""
                  width={3000}
                  height={3000}
                  sizes="(max-width: 640px) 36px, 44px"
                  className="absolute -right-1 top-3 z-0 h-auto w-9 rotate-[8deg] drop-shadow-[0_8px_13px_rgba(0,0,0,0.45)] sm:-right-1 sm:top-4 sm:w-11"
                  priority
                />
              </>
            )}
          </div>
        )}

      </section>
    </main>
  );
}
