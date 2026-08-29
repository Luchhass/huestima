"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { adminRequest } from "@/lib/adminApi";
import { pushNotification } from "@/components/ui/GlobalPushNotifications";
import RoomCardShell from "@/components/sections/room/RoomCardShell";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useAdminMode } from "@/hooks/useAdminMode";
import { useTranslation } from "@/hooks/useLanguage";
import {
  playScreenFadeOut,
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import { useSiteOperations } from "@/hooks/useSiteOperations";
import { GAME_FAMILY_MODE_IDS, GAME_FAMILY_OPTIONS } from "@/lib/gameFamily";
import { GAME_MODE_OPTIONS } from "@/lib/constants";
import {
  markAdminHomeReturn,
  playCardToCardExit,
} from "@/hooks/useFooterPageTransition";

const EXPANDED_REVEAL_DELAY = 320;
const ADMIN_CARD_SHIFT_DURATION_MS = 720;
const ADMIN_TRANSITION_REVEAL_GUARD_DELAY = 2000;
const ADMIN_CARD_SHIFT_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const ADMIN_CARD_RADIUS = 26;
const SIDE_REVEAL_FRAME_COUNT = 60;
const ADMIN_PANELS = {
  HOME: "home",
  OPERATIONS: "operations",
  INSIGHTS: "insights",
  CONFIGURATION: "configuration",
};

function waitForPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

function waitForDuration(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function createSideRevealKeyframes(opening, width) {
  const frames = Array.from(
    { length: SIDE_REVEAL_FRAME_COUNT + 1 },
    (_, index) => {
      const progress = index / SIDE_REVEAL_FRAME_COUNT;
      const scale = 0.001 + progress * 0.999;
      const visibleWidth = width * scale;
      const visibleRadius = Math.min(ADMIN_CARD_RADIUS, visibleWidth / 2);

      return {
        scale,
        horizontalRadius: visibleRadius / scale,
      };
    },
  );
  const orderedFrames = opening ? frames : frames.reverse();

  return orderedFrames.map(({ scale, horizontalRadius }, index) => ({
    transform: `scaleX(${scale})`,
    borderRadius: `${horizontalRadius}px / ${ADMIN_CARD_RADIUS}px`,
    offset: index / SIDE_REVEAL_FRAME_COUNT,
  }));
}

function createCardTransitionClone(card) {
  if (!card) return null;

  const rect = card.getBoundingClientRect();
  const styles = window.getComputedStyle(card);
  const clone = document.createElement("div");
  Object.assign(clone.style, {
    position: "fixed",
    zIndex: "180",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: styles.borderRadius || "26px",
    background: styles.backgroundColor || "#000000",
    boxShadow: styles.boxShadow,
    pointerEvents: "none",
    willChange: "left, top, width, height",
  });
  document.body.appendChild(clone);
  return { clone, sourceRect: rect };
}

function createSideTransitionClone(side) {
  if (!side) return null;

  const rect = side.getBoundingClientRect();
  const clone = side.cloneNode(true);
  clone.removeAttribute("data-admin-workspace-side");
  clone.className = "admin-operations-side admin-operations-side--settled";
  clone.querySelectorAll("[data-screen-reveal]").forEach((item) => {
    item.style.opacity = "0";
    item.style.visibility = "hidden";
  });
  Object.assign(clone.style, {
    position: "fixed",
    zIndex: "179",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    visibility: "visible",
    opacity: "1",
    pointerEvents: "none",
    willChange: "left, top, height",
  });
  document.body.appendChild(clone);
  return { clone, sourceRect: rect };
}

async function fadeWorkspaceContents(scope) {
  if (!scope) return;
  const primaryContent = scope.querySelector("[data-admin-primary-content]");
  const sideItems = Array.from(
    scope.querySelectorAll(
      "[data-admin-workspace-side] [data-screen-reveal]",
    ),
  );
  const items = [primaryContent, ...sideItems].filter(Boolean);
  if (!items.length) return;

  const animations = items.map((item) => item.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    {
      duration: 220,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "both",
    },
  ));
  await Promise.all(
    animations.map((animation) => animation.finished.catch(() => undefined)),
  );
  items.forEach((item) => {
    item.style.opacity = "0";
  });
  animations.forEach((animation) => animation.cancel());
}

async function animateSideCloneToPoint(
  transitionSide,
  targetLeftX,
  targetTopY,
  targetHeight,
) {
  if (
    !transitionSide?.clone ||
    !Number.isFinite(targetLeftX) ||
    !Number.isFinite(targetTopY) ||
    !Number.isFinite(targetHeight)
  ) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { clone, sourceRect } = transitionSide;
  const frameAnimations = Array.from(
    clone.querySelectorAll(":scope > .admin-side-card-frame"),
  ).map((frame) => {
    const revealTarget = frame.firstElementChild || frame;
    const width = frame.getBoundingClientRect().width;
    revealTarget.style.transformOrigin = "left center";
    revealTarget.style.willChange = "transform, border-radius";
    return revealTarget.animate(
      createSideRevealKeyframes(false, width),
      {
        duration: ADMIN_CARD_SHIFT_DURATION_MS,
        easing: ADMIN_CARD_SHIFT_EASE,
        fill: "both",
      },
    );
  });
  const positionAnimation = clone.animate(
    [
      {
        left: `${sourceRect.left}px`,
        top: `${sourceRect.top}px`,
        height: `${sourceRect.height}px`,
      },
      {
        left: `${targetLeftX}px`,
        top: `${targetTopY}px`,
        height: `${targetHeight}px`,
      },
    ],
    {
      duration: ADMIN_CARD_SHIFT_DURATION_MS,
      easing: ADMIN_CARD_SHIFT_EASE,
      fill: "both",
    },
  );

  try {
    await Promise.all([
      positionAnimation.finished,
      ...frameAnimations.map((animation) => animation.finished),
    ]);
  } catch {
    // A newer navigation owns the reverse workspace transition.
  }
}

async function animateCardClone(transitionCard, targetCard) {
  if (!transitionCard?.clone || !targetCard) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { clone, sourceRect } = transitionCard;
  const targetRect = targetCard.getBoundingClientRect();
  const animation = clone.animate(
    [
      {
        left: `${sourceRect.left}px`,
        top: `${sourceRect.top}px`,
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`,
      },
      {
        left: `${targetRect.left}px`,
        top: `${targetRect.top}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
      },
    ],
    {
      duration: ADMIN_CARD_SHIFT_DURATION_MS,
      easing: ADMIN_CARD_SHIFT_EASE,
      fill: "both",
    },
  );

  try {
    await animation.finished;
  } catch {
    // A newer navigation owns the transition when this animation is cancelled.
  }
}

async function animateWorkspaceSide(
  side,
  {
    onComplete,
    startTranslateX = 0,
    startTranslateY = 0,
    startScaleY = 1,
    duration,
  } = {},
) {
  if (!side) {
    onComplete?.();
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const sideFrames = Array.from(
    side.querySelectorAll(":scope > .admin-side-card-frame"),
  );
  const finalHeight = side.getBoundingClientRect().height;
  const startHeight = finalHeight * startScaleY;
  sideFrames.forEach((frame) => {
    const revealTarget = frame.firstElementChild || frame;
    const width = frame.getBoundingClientRect().width;
    const startHorizontalRadius = Math.min(
      width / 2,
      ADMIN_CARD_RADIUS / 0.001,
    );
    revealTarget.style.transform = "scaleX(0.001)";
    revealTarget.style.transformOrigin = "left center";
    revealTarget.style.borderRadius = `${startHorizontalRadius}px / ${ADMIN_CARD_RADIUS}px`;
    revealTarget.style.willChange = "transform, border-radius";
  });
  side.style.height = `${startHeight}px`;
  side.style.visibility = "visible";
  side.style.opacity = "1";
  side.style.transformOrigin = "left top";

  if (reducedMotion) {
    onComplete?.();
    side.style.removeProperty("visibility");
    side.style.removeProperty("opacity");
    side.style.removeProperty("transform-origin");
    side.style.removeProperty("height");
    sideFrames.forEach((frame) => {
      const revealTarget = frame.firstElementChild || frame;
      revealTarget.style.removeProperty("transform");
      revealTarget.style.removeProperty("transform-origin");
      revealTarget.style.removeProperty("border-radius");
      revealTarget.style.removeProperty("will-change");
    });
    return;
  }

  const collapsedFrame = {
    transform: `translate3d(${startTranslateX}px, ${startTranslateY}px, 0)`,
    height: `${startHeight}px`,
  };
  const expandedFrame = {
    transform: "translate3d(0, 0, 0)",
    height: `${finalHeight}px`,
  };
  const frameAnimations = sideFrames.map((frame) => {
    const revealTarget = frame.firstElementChild || frame;
    const width = frame.getBoundingClientRect().width;
    return revealTarget.animate(
      createSideRevealKeyframes(true, width),
      {
        duration: duration ?? ADMIN_CARD_SHIFT_DURATION_MS,
        easing: ADMIN_CARD_SHIFT_EASE,
        fill: "both",
      },
    );
  });
  const positionAnimation = side.animate(
    [collapsedFrame, expandedFrame],
    {
      duration: duration ?? ADMIN_CARD_SHIFT_DURATION_MS,
      easing: ADMIN_CARD_SHIFT_EASE,
      fill: "both",
    },
  );

  try {
    await Promise.all([
      positionAnimation.finished,
      ...frameAnimations.map((animation) => animation.finished),
    ]);
  } catch {
    // A newer panel transition owns the side cards.
  }

  onComplete?.();
  await waitForPaint();
  positionAnimation.cancel();
  frameAnimations.forEach((animation) => animation.cancel());
  side.style.removeProperty("height");
  sideFrames.forEach((frame) => {
    const revealTarget = frame.firstElementChild || frame;
    revealTarget.style.removeProperty("transform");
    revealTarget.style.removeProperty("transform-origin");
    revealTarget.style.removeProperty("border-radius");
    revealTarget.style.removeProperty("will-change");
  });
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  side.style.removeProperty("transform-origin");
}

function createDefaultGameConfiguration() {
  return Object.fromEntries(
    GAME_FAMILY_OPTIONS.map(({ id }) => [
      id,
      {
        enabled: true,
        modes: Object.fromEntries(
          (GAME_FAMILY_MODE_IDS[id] || []).map((modeId) => [modeId, true]),
        ),
      },
    ]),
  );
}

export default function AdminPage() {
  useAppChromeHidden(true);
  const router = useRouter();
  const { locale, t } = useTranslation();
  const {
    enabled: cheatModeEnabled,
    enableAdmin,
    disableAdmin,
    refreshSession,
    sessionValid,
  } = useAdminMode();
  const { operations, ready: operationsReady } = useSiteOperations();
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState(ADMIN_PANELS.HOME);
  const [workspaceSidePhase, setWorkspaceSidePhase] = useState("waiting");
  const [isPrimaryCardHidden, setIsPrimaryCardHidden] = useState(false);
  const [screenRevealDelay, setScreenRevealDelay] = useState(
    EXPANDED_REVEAL_DELAY,
  );
  const [announcement, setAnnouncement] = useState("");
  const [operationBusy, setOperationBusy] = useState("");
  const [systemSummary, setSystemSummary] = useState(null);
  const [summaryAvailable, setSummaryAvailable] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLogoutConfirmClosing, setIsLogoutConfirmClosing] = useState(false);
  const [isMaintenanceConfirmOpen, setIsMaintenanceConfirmOpen] = useState(false);
  const [isMaintenanceConfirmClosing, setIsMaintenanceConfirmClosing] = useState(false);
  const [isMultiplayerConfirmOpen, setIsMultiplayerConfirmOpen] = useState(false);
  const [isMultiplayerConfirmClosing, setIsMultiplayerConfirmClosing] = useState(false);
  const [gameConfiguration, setGameConfiguration] = useState(
    createDefaultGameConfiguration,
  );
  const scopeRef = useRef(null);
  const isChangingPanelRef = useRef(false);
  useScreenReveal(scopeRef, [ready, panel, locale], {
    delay: screenRevealDelay,
    defer: !ready,
    synchronous: false,
    duration: panel !== ADMIN_PANELS.HOME ? 0.72 : undefined,
    ease: panel !== ADMIN_PANELS.HOME ? "power3.out" : undefined,
  });

  useEffect(() => {
    let active = true;
    let redirecting = false;

    const redirectToLogin = async () => {
      if (redirecting) return;
      redirecting = true;
      await playScreenFadeOut(scopeRef, { duration: 0.24 });
      if (active) router.replace("/admin/login");
    };

    const validateSession = () => {
      adminRequest("/me").then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          disableAdmin();
          await redirectToLogin();
          return;
        }

        // The provider can have completed its initial check before the login
        // request set the cookie. Refresh it here so the switch is enabled
        // immediately after arriving on the admin page.
        const providerSessionValid = await refreshSession();
        if (!active || !providerSessionValid) {
          disableAdmin();
          await redirectToLogin();
          return;
        }
        setReady(true);
      }).catch(async () => {
        if (!active) return;
        disableAdmin();
        pushNotification(t("admin.messages.sessionLoadFailed"), "error");
        await redirectToLogin();
      });
    };

    validateSession();
    const intervalId = window.setInterval(validateSession, 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [disableAdmin, refreshSession, router, t]);

  useEffect(() => {
    if (!ready || panel !== ADMIN_PANELS.INSIGHTS) return undefined;
    let active = true;

    const loadSummary = async () => {
      try {
        const response = await adminRequest("/system-summary");
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error("Summary unavailable.");
        if (!active) return;
        setSystemSummary(data.summary);
        setSummaryAvailable(true);
      } catch {
        if (active) setSummaryAvailable(false);
      }
    };

    void loadSummary();
    const intervalId = window.setInterval(loadSummary, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [panel, ready]);

  useEffect(() => {
    if (!ready) return undefined;
    let active = true;
    adminRequest("/operations").then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (active && response.ok && data.operations?.gameConfiguration) {
        setGameConfiguration((current) => ({
          ...current,
          ...data.operations.gameConfiguration,
        }));
      }
    });
    return () => { active = false; };
  }, [ready]);

  async function changePanel(nextPanel) {
    if (nextPanel === panel || isChangingPanelRef.current) return;
    isChangingPanelRef.current = true;
    const isOpeningWorkspace = panel === ADMIN_PANELS.HOME;
    const currentPrimary = isOpeningWorkspace
      ? scopeRef.current?.closest(".game-card-shell")
      : scopeRef.current?.querySelector("[data-admin-primary-card]") ||
        scopeRef.current;
    const isClosingSplitWorkspace =
      !isOpeningWorkspace && panel !== ADMIN_PANELS.CONFIGURATION;
    const currentSide = isClosingSplitWorkspace
      ? scopeRef.current?.querySelector("[data-admin-workspace-side]")
      : null;
    const currentPrimaryRect = currentPrimary?.getBoundingClientRect();
    const currentSideRect = currentSide?.getBoundingClientRect();
    const currentGap = currentPrimaryRect && currentSideRect
      ? currentSideRect.left - currentPrimaryRect.right
      : 0;
    let transitionCard = null;
    let transitionSide = null;

    try {
      if (isClosingSplitWorkspace) {
        await fadeWorkspaceContents(scopeRef.current);
      } else {
        const currentContent = isOpeningWorkspace
          ? scopeRef.current
          : currentPrimary?.querySelector("[data-admin-primary-content]") ||
            scopeRef.current;
        await playScreenFadeOut(currentContent, { duration: 0.24 });
      }

      transitionCard = createCardTransitionClone(currentPrimary);
      transitionSide = isClosingSplitWorkspace
        ? createSideTransitionClone(currentSide)
        : null;
      setIsPrimaryCardHidden(true);
      setScreenRevealDelay(ADMIN_TRANSITION_REVEAL_GUARD_DELAY);
      setWorkspaceSidePhase("waiting");
      setPanel(nextPanel);
      await waitForPaint();

      const nextPrimary = nextPanel === ADMIN_PANELS.HOME
        ? scopeRef.current?.closest(".game-card-shell")
        : scopeRef.current?.querySelector("[data-admin-primary-card]") ||
          scopeRef.current;

      const isSplitWorkspace =
        nextPanel === ADMIN_PANELS.OPERATIONS ||
        nextPanel === ADMIN_PANELS.INSIGHTS;
      const nextSide = isSplitWorkspace
        ? scopeRef.current?.querySelector("[data-admin-workspace-side]")
        : null;
      const primaryRect = nextPrimary?.getBoundingClientRect();
      const sideRect = nextSide?.getBoundingClientRect();
      const finalGap = primaryRect && sideRect
        ? sideRect.left - primaryRect.right
        : 0;
      const sideStartTranslateX = transitionCard?.sourceRect && sideRect
        ? transitionCard.sourceRect.right + finalGap - sideRect.left
        : 0;
      const sideStartTranslateY = transitionCard?.sourceRect && sideRect
        ? transitionCard.sourceRect.top - sideRect.top
        : 0;
      const sideStartScaleY = transitionCard?.sourceRect && sideRect
        ? transitionCard.sourceRect.height / Math.max(sideRect.height, 1)
        : 1;
      const closingSideTargetLeft = transitionSide && primaryRect
        ? primaryRect.right + currentGap
        : null;
      const closingSideTargetTop = transitionSide && primaryRect
        ? primaryRect.top
        : null;
      const cardMotion = animateCardClone(transitionCard, nextPrimary);
      let sideMotion = Promise.resolve();

      if (isSplitWorkspace) {
        sideMotion = animateWorkspaceSide(nextSide, {
          startTranslateX: sideStartTranslateX,
          startTranslateY: sideStartTranslateY,
          startScaleY: sideStartScaleY,
          duration: ADMIN_CARD_SHIFT_DURATION_MS,
          onComplete: () => setWorkspaceSidePhase("settled"),
        });
      } else if (
        transitionSide &&
        Number.isFinite(closingSideTargetLeft) &&
        Number.isFinite(closingSideTargetTop)
      ) {
        sideMotion = animateSideCloneToPoint(
          transitionSide,
          closingSideTargetLeft,
          closingSideTargetTop,
          primaryRect.height,
        );
      }

      await Promise.all([cardMotion, sideMotion]);
      setIsPrimaryCardHidden(false);
      await waitForPaint();
      transitionCard?.clone.remove();
      transitionCard = null;
      transitionSide?.clone.remove();
      transitionSide = null;
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    } finally {
      transitionCard?.clone.remove();
      transitionSide?.clone.remove();
      setIsPrimaryCardHidden(false);
      setScreenRevealDelay(EXPANDED_REVEAL_DELAY);
      isChangingPanelRef.current = false;
    }
  }

  async function confirmLogout() {
    setIsLogoutConfirmOpen(false);
    try {
      const response = await adminRequest("/logout", { method: "POST", body: "{}" });
      if (!response.ok) throw new Error(t("admin.messages.logoutFailed"));
      disableAdmin();
      const card = scopeRef.current?.closest(".game-card-shell");
      await playCardToCardExit(card, scopeRef, {
        targetExpanded: false,
        hideChrome: false,
      });
      router.replace("/admin/login");
    } catch (error) {
      pushNotification(error.message, "error");
    }
  }

  function closeLogoutConfirm() {
    setIsLogoutConfirmClosing(true);
    window.setTimeout(() => {
      setIsLogoutConfirmOpen(false);
      setIsLogoutConfirmClosing(false);
    }, 280);
  }

  async function goHome() {
    const card = scopeRef.current?.closest(".game-card-shell");
    await playCardToCardExit(card, scopeRef, {
      targetExpanded: false,
      hideChrome: false,
    });
    markAdminHomeReturn();
    router.replace("/color");
  }

  async function updateOperation(path, body, busyKey, successMessage) {
    if (operationBusy) return false;
    setOperationBusy(busyKey);

    try {
      const response = await adminRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(t("admin.messages.operationFailed"));
      }
      pushNotification(successMessage, "success");
      return true;
    } catch (error) {
      pushNotification(error.message, "error");
      return false;
    } finally {
      setOperationBusy("");
    }
  }

  async function toggleGameConfiguration(familyId, modeId = null) {
    if (operationBusy) return;
    const previous = gameConfiguration;
    const family = previous[familyId];
    const nextFamily = modeId === null
      ? {
          ...family,
          enabled: !family.enabled,
          modes: family.enabled
            ? Object.fromEntries(
                Object.keys(family.modes || {}).map((id) => [id, false]),
              )
            : family.modes,
        }
      : { ...family, modes: { ...family.modes, [modeId]: !family.modes[modeId] } };
    const nextConfiguration = { ...previous, [familyId]: nextFamily };
    setGameConfiguration(nextConfiguration);
    const updated = await updateOperation(
      "/operations/game-configuration",
      { configuration: nextConfiguration },
      `game-${familyId}-${modeId || "family"}`,
      t("admin.messages.gameConfigurationUpdated"),
    );
    if (!updated) setGameConfiguration(previous);
  }

  async function publishAnnouncement() {
    const message = announcement.trim();
    if (!message) return;

    const updated = await updateOperation(
      "/operations/announcement",
      { message },
      "announcement",
      t("admin.messages.announcementSent"),
    );
    if (updated) setAnnouncement("");
  }

  async function clearAnnouncement() {
    await updateOperation(
      "/operations/announcement",
      { message: "" },
      "announcement",
      t("admin.messages.announcementCleared"),
    );
  }

  async function toggleMultiplayer() {
    if (!operationsReady) return;
    const enabled = !operations.multiplayerEnabled;
    setIsMultiplayerConfirmOpen(true);
    return;
  }

  async function applyMultiplayerToggle(enabled) {
    await updateOperation(
      "/operations/multiplayer",
      { enabled },
      "multiplayer",
      t(enabled ? "admin.messages.multiplayerEnabled" : "admin.messages.multiplayerDisabled"),
    );
  }

  function closeMultiplayerConfirm() {
    setIsMultiplayerConfirmClosing(true);
    window.setTimeout(() => {
      setIsMultiplayerConfirmOpen(false);
      setIsMultiplayerConfirmClosing(false);
    }, 280);
  }

  async function confirmMultiplayer() {
    setIsMultiplayerConfirmOpen(false);
    await applyMultiplayerToggle(!operations.multiplayerEnabled);
  }

  async function toggleMaintenance() {
    if (!operationsReady) return;
    const enabled = !operations.maintenanceEnabled;
    if (enabled) {
      setIsMaintenanceConfirmOpen(true);
      return;
    }

    await applyMaintenanceToggle(false);
  }

  async function applyMaintenanceToggle(enabled) {
    await updateOperation(
      "/operations/maintenance",
      { enabled },
      "maintenance",
      t(enabled ? "admin.messages.maintenanceEnabled" : "admin.messages.maintenanceDisabled"),
    );
  }

  function closeMaintenanceConfirm() {
    setIsMaintenanceConfirmClosing(true);
    window.setTimeout(() => {
      setIsMaintenanceConfirmOpen(false);
      setIsMaintenanceConfirmClosing(false);
    }, 280);
  }

  async function confirmMaintenance() {
    setIsMaintenanceConfirmOpen(false);
    await applyMaintenanceToggle(true);
  }

  const isHomePanel = panel === ADMIN_PANELS.HOME;
  const liveSummary = systemSummary?.live;
  const gameSummary = systemSummary?.games;

  if (ready && panel === ADMIN_PANELS.OPERATIONS) {
    return (
      <AdminOperationsWorkspace
        scopeRef={scopeRef}
        sidePhase={workspaceSidePhase}
        primaryHidden={isPrimaryCardHidden}
        t={t}
        announcement={announcement}
        setAnnouncement={setAnnouncement}
        operations={operations}
        operationsReady={operationsReady}
        operationBusy={operationBusy}
        cheatModeEnabled={cheatModeEnabled}
        sessionValid={sessionValid}
        enableAdmin={enableAdmin}
        disableAdmin={disableAdmin}
        publishAnnouncement={publishAnnouncement}
        clearAnnouncement={clearAnnouncement}
        toggleMultiplayer={toggleMultiplayer}
        toggleMaintenance={toggleMaintenance}
        isMaintenanceConfirmOpen={isMaintenanceConfirmOpen}
        isMaintenanceConfirmClosing={isMaintenanceConfirmClosing}
        closeMaintenanceConfirm={closeMaintenanceConfirm}
        confirmMaintenance={confirmMaintenance}
        isMultiplayerConfirmOpen={isMultiplayerConfirmOpen}
        isMultiplayerConfirmClosing={isMultiplayerConfirmClosing}
        closeMultiplayerConfirm={closeMultiplayerConfirm}
        confirmMultiplayer={confirmMultiplayer}
        onClose={() => void changePanel(ADMIN_PANELS.HOME)}
      />
    );
  }

  if (ready && panel === ADMIN_PANELS.INSIGHTS) {
    return (
      <AdminInsightsWorkspace
        scopeRef={scopeRef}
        sidePhase={workspaceSidePhase}
        primaryHidden={isPrimaryCardHidden}
        t={t}
        locale={locale}
        summary={systemSummary}
        summaryAvailable={summaryAvailable}
        onClose={() => void changePanel(ADMIN_PANELS.HOME)}
      />
    );
  }

  if (ready && panel === ADMIN_PANELS.CONFIGURATION) {
    return (
      <AdminGameConfigurationWorkspace
        scopeRef={scopeRef}
        primaryHidden={isPrimaryCardHidden}
        t={t}
        configuration={gameConfiguration}
        operationBusy={operationBusy}
        onToggle={toggleGameConfiguration}
        onClose={() => void changePanel(ADMIN_PANELS.HOME)}
      />
    );
  }

  return (
    <>
      {isMaintenanceConfirmOpen && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[240] max-w-[calc(100vw-2rem)]">
          <div className={`admin-confirm-modal pointer-events-auto w-full max-w-[24rem] rounded-[24px] bg-black px-5 py-5 text-white shadow-[var(--app-card-shadow)] sm:px-6 sm:py-6 ${isMaintenanceConfirmClosing ? "admin-confirm-modal--closing" : ""}`}>
            <div className="max-w-[18.5rem]">
              <h2 className="text-lg font-semibold leading-tight text-white sm:text-xl">
                {t("admin.operations.maintenanceTitle")}
              </h2>
              <p className="mt-3 text-sm font-medium leading-snug text-white/74 sm:text-[0.95rem]">
                {t("admin.confirm.enableMaintenance")}
              </p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={closeMaintenanceConfirm} className="app-secondary-action inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                {t("common.no")}
              </button>
              <button type="button" onClick={() => void confirmMaintenance()} className="rgb-hover-button inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                {t("common.yes")}
              </button>
            </div>
          </div>
        </div>
      )}
      {isLogoutConfirmOpen && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[240] max-w-[calc(100vw-2rem)]">
          <div className={`admin-confirm-modal pointer-events-auto w-full max-w-[24rem] rounded-[24px] bg-black px-5 py-5 text-white shadow-[var(--app-card-shadow)] sm:px-6 sm:py-6 ${isLogoutConfirmClosing ? "admin-confirm-modal--closing" : ""}`}>
            <div className="max-w-[18.5rem]">
              <h2 className="text-lg font-semibold leading-tight text-white sm:text-xl">
                {t("admin.confirm.logoutTitle")}
              </h2>
              <p className="mt-3 text-sm font-medium leading-snug text-white/74 sm:text-[0.95rem]">
                {t("admin.confirm.logoutDescription")}
              </p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeLogoutConfirm}
                className="app-secondary-action inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("common.no")}
              </button>
              <button
                type="button"
                onClick={() => void confirmLogout()}
                className="rgb-hover-button inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t("common.yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      <RoomCardShell
        isExpanded
        cardClassName={isPrimaryCardHidden ? "admin-primary-card--waiting" : ""}
      >
        <div
          ref={scopeRef}
          data-route-transition-scope
          className="relative flex h-full flex-col bg-black p-6 text-white sm:p-8"
        >
        {ready && (
          <>
            {!isHomePanel && (
              <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7">
                <button
                  type="button"
                  aria-label={t("admin.common.back")}
                  onClick={() => void changePanel(ADMIN_PANELS.HOME)}
                  className="grid size-11 place-items-center rounded-full text-white/70 transition-opacity hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <X size={25} strokeWidth={1.8} />
                </button>
              </div>
            )}

            {isHomePanel && (
              <>
                <div data-screen-reveal className="max-w-100 pr-12">
                  <h1 className="admin-workspace-title admin-workspace-title--primary whitespace-nowrap">
                    {t("admin.home.title")}
                  </h1>
                  <p className="mt-3.5 max-w-[36.75rem] text-[0.92rem] font-medium leading-[1.28] text-white/82 sm:mt-4 sm:text-[0.98rem]">
                    {t("admin.home.description")}
                  </p>
                </div>

                <nav
                  data-screen-reveal
                  className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto"
                >
                  <AdminNavigationRow
                    title={t("admin.operations.title")}
                    description={t("admin.operations.menuDescription")}
                    onClick={() => void changePanel(ADMIN_PANELS.OPERATIONS)}
                  />
                  <AdminNavigationRow
                    title={t("admin.insights.title")}
                    description={t("admin.insights.menuDescription")}
                    onClick={() => void changePanel(ADMIN_PANELS.INSIGHTS)}
                  />
                  <AdminNavigationRow
                    title={t("admin.configuration.title")}
                    description={t("admin.configuration.menuDescription")}
                    onClick={() => void changePanel(ADMIN_PANELS.CONFIGURATION)}
                  />
                </nav>

                <div data-screen-reveal className="mt-auto grid w-full grid-cols-2 gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    className="app-secondary-action card-action-height inline-flex w-full items-center justify-center rounded-full border-2 border-white/90 bg-transparent px-4 text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <span>{t("admin.common.logout")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={goHome}
                    className="rgb-hover-button card-action-height inline-flex w-full items-center justify-center rounded-full bg-white px-4 text-base font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <span className="relative z-10">{t("admin.common.home")}</span>
                  </button>
                </div>
              </>
            )}

            {panel === ADMIN_PANELS.OPERATIONS && (
              <>
                <AdminPanelHeader
                  title={t("admin.operations.title")}
                  description={t("admin.operations.description")}
                />

                <div data-screen-reveal className="scrollbar-hidden mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="border-t border-white/15 pt-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold">
                          {t("admin.operations.announcementTitle")}
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          {t("admin.operations.announcementDescription")}
                        </p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-white/35">
                        {announcement.length}/280
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        maxLength={280}
                        value={announcement}
                        onChange={(event) => setAnnouncement(event.target.value)}
                        placeholder={t("admin.operations.announcementPlaceholder")}
                        aria-label={t("admin.operations.announcementPlaceholder")}
                        className="card-control-frame card-action-height min-w-0 flex-1 px-5 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-white/20"
                      />
                      <button
                        type="button"
                        disabled={!operationsReady || !announcement.trim() || Boolean(operationBusy)}
                        onClick={publishAnnouncement}
                        className="card-action-height rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t("admin.operations.send")}
                      </button>
                    </div>
                    {operations.announcement && (
                      <button
                        type="button"
                        disabled={!operationsReady || Boolean(operationBusy)}
                        onClick={clearAnnouncement}
                        className="mt-2 text-xs font-semibold text-white/50 transition-colors hover:text-white disabled:opacity-40"
                      >
                        {t("admin.operations.clearAnnouncement")}
                      </button>
                    )}
                  </div>

                  <AdminToggleRow
                    title={t("admin.operations.cheatTitle")}
                    description={t("admin.operations.cheatDescription")}
                    checked={cheatModeEnabled}
                    disabled={!sessionValid}
                    onClick={() => (cheatModeEnabled ? disableAdmin() : enableAdmin())}
                    ariaLabel={t("admin.operations.cheatAria")}
                  />
                  <AdminToggleRow
                    title={t("admin.operations.multiplayerTitle")}
                    description={t("admin.operations.multiplayerDescription")}
                    checked={operations.multiplayerEnabled}
                    disabled={!operationsReady || Boolean(operationBusy)}
                    onClick={toggleMultiplayer}
                    ariaLabel={t("admin.operations.multiplayerAria")}
                  />
                  <AdminToggleRow
                    title={t("admin.operations.maintenanceTitle")}
                    description={t("admin.operations.maintenanceDescription")}
                    checked={operations.maintenanceEnabled}
                    disabled={!operationsReady || Boolean(operationBusy)}
                    onClick={toggleMaintenance}
                    ariaLabel={t("admin.operations.maintenanceAria")}
                    danger
                  />
                </div>
              </>
            )}

            {panel === ADMIN_PANELS.INSIGHTS && (
              <>
                <AdminPanelHeader
                  title={t("admin.insights.title")}
                  description={t("admin.insights.description")}
                />

                <div data-screen-reveal className="scrollbar-hidden mt-6 min-h-0 flex-1 overflow-y-auto border-t border-white/15 pt-4 pr-1">
                  <div className="flex items-center justify-between gap-4 text-xs font-semibold text-white/45">
                    <span>{t("admin.insights.refreshDescription")}</span>
                    <span className="inline-flex items-center gap-2 text-white/60">
                      <span className={`size-2 rounded-full ${summaryAvailable ? "bg-emerald-400" : "bg-red-400"}`} />
                      {t(summaryAvailable ? "admin.insights.live" : "admin.insights.unavailable")}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-[minmax(0,1.35fr)_minmax(10rem,0.85fr)] gap-3">
                    <section className="rounded-[22px] bg-white/[0.055] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                        {t("admin.insights.liveActivity")}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-5">
                        <DashboardValue label={t("admin.insights.online")} value={liveSummary?.onlineVisitors} />
                        <DashboardValue label={t("admin.insights.players")} value={liveSummary?.activePlayers} />
                      </div>
                      <div className="mt-5 grid grid-cols-2 border-t border-white/10 pt-3">
                        <CompactValue label={t("admin.insights.lobbies")} value={liveSummary?.openLobbies} />
                        <CompactValue label={t("admin.insights.liveGames")} value={liveSummary?.gamesInProgress} bordered />
                      </div>
                    </section>

                    <ActivityDonut
                      label={t("admin.insights.games24h")}
                      started={gameSummary?.started24h}
                      completed={gameSummary?.completed24h}
                      completedLabel={t("admin.insights.completed")}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 divide-x divide-white/10 rounded-[18px] border border-white/10 px-2 py-3">
                    <FooterMetric label={t("admin.insights.gamesTotal")} value={gameSummary?.startedTotal} />
                    <FooterMetric label={t("admin.insights.averagePlayersShort")} value={gameSummary?.averagePlayers24h} />
                    <FooterMetric label={t("admin.insights.uptimeShort")} value={formatUptime(systemSummary?.uptimeSeconds, t)} />
                  </div>

                  {gameSummary?.families24h?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {gameSummary.families24h.map((item) => (
                        <span key={item.id} className="rounded-full bg-white/[0.055] px-3 py-1.5 text-[11px] font-semibold text-white/60">
                          {t(`gameFamily.${item.id}`)} <strong className="ml-1 text-white">{item.games}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
        </div>
      </RoomCardShell>
    </>
  );
}

function AdminGameConfigurationWorkspace({
  scopeRef,
  primaryHidden,
  t,
  configuration,
  operationBusy,
  onToggle,
  onClose,
}) {
  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-4 sm:p-8">
      <div ref={scopeRef} data-route-transition-scope data-admin-primary-card className={`admin-configuration-card bg-black ${primaryHidden ? "admin-primary-card--waiting" : ""}`}>
        <section data-admin-primary-content className="relative flex h-full min-h-0 flex-col overflow-hidden p-6 text-white sm:p-8">
          <button type="button" aria-label={t("admin.common.back")} onClick={onClose} className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full text-white/70 transition-opacity hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-7 sm:top-7">
            <X size={25} strokeWidth={1.8} />
          </button>
          <div data-screen-reveal className="max-w-full pr-10">
            <h1 className="whitespace-nowrap text-[clamp(1.8rem,6.5vw,2.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]">{t("admin.configuration.title")}</h1>
            <p className="mt-4 text-sm font-medium leading-[1.35] text-white/65 sm:text-base">{t("admin.configuration.description")}</p>
          </div>
          <div data-screen-reveal className="scrollbar-hidden mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            {GAME_FAMILY_OPTIONS.map(({ id }) => {
              const family = configuration[id] || { enabled: true, modes: {} };
              const modes = GAME_FAMILY_MODE_IDS[id] || [];
              return (
                <div data-screen-reveal key={id} className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-lg font-semibold">{t(`gameFamily.${id}`)}</p>
                    <AdminSwitch checked={family.enabled} disabled={Boolean(operationBusy)} onClick={() => onToggle(id)} ariaLabel={`${t(`gameFamily.${id}`)} ${t("admin.configuration.gameAria")}`} />
                  </div>
                  <div className="mt-3 grid gap-2 pl-3">
                    {modes.map((modeId) => {
                      const mode = GAME_MODE_OPTIONS.find((option) => option.id === modeId);
                      return (
                        <div data-screen-reveal key={modeId} className="flex items-center justify-between gap-4 text-sm text-white/65">
                          <span>{t(`gameMode.${modeId}`) || mode?.id || modeId}</span>
                          <AdminSwitch checked={family.modes?.[modeId] !== false} disabled={!family.enabled || Boolean(operationBusy)} onClick={() => onToggle(id, modeId)} ariaLabel={`${t(`gameMode.${modeId}`)} ${t("admin.configuration.modeAria")}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminOperationsWorkspace({
  scopeRef,
  sidePhase,
  primaryHidden,
  t,
  announcement,
  setAnnouncement,
  operations,
  operationsReady,
  operationBusy,
  cheatModeEnabled,
  sessionValid,
  enableAdmin,
  disableAdmin,
  publishAnnouncement,
  clearAnnouncement,
  toggleMultiplayer,
  toggleMaintenance,
  isMaintenanceConfirmOpen,
  isMaintenanceConfirmClosing,
  closeMaintenanceConfirm,
  confirmMaintenance,
  isMultiplayerConfirmOpen,
  isMultiplayerConfirmClosing,
  closeMultiplayerConfirm,
  confirmMultiplayer,
  onClose,
}) {
  return (
    <>
    {isMultiplayerConfirmOpen && (
      <div className="pointer-events-none fixed bottom-6 right-6 z-[240] max-w-[calc(100vw-2rem)]">
        <div className={`admin-confirm-modal pointer-events-auto w-full max-w-[24rem] rounded-[24px] bg-black px-5 py-5 text-white shadow-[var(--app-card-shadow)] sm:px-6 sm:py-6 ${isMultiplayerConfirmClosing ? "admin-confirm-modal--closing" : ""}`}>
          <div className="max-w-[18.5rem]">
            <h2 className="text-lg font-semibold leading-tight text-white sm:text-xl">{t("admin.operations.multiplayerTitle")}</h2>
            <p className="mt-3 text-sm font-medium leading-snug text-white/74 sm:text-[0.95rem]">{t(operations.multiplayerEnabled ? "admin.confirm.disableMultiplayer" : "admin.confirm.enableMultiplayer")}</p>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            <button type="button" onClick={closeMultiplayerConfirm} className="app-secondary-action inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{t("common.no")}</button>
            <button type="button" onClick={() => void confirmMultiplayer()} className="rgb-hover-button inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{t("common.yes")}</button>
          </div>
        </div>
      </div>
    )}
    {isMaintenanceConfirmOpen && (
      <div className="pointer-events-none fixed bottom-6 right-6 z-[240] max-w-[calc(100vw-2rem)]">
        <div className={`admin-confirm-modal pointer-events-auto w-full max-w-[24rem] rounded-[24px] bg-black px-5 py-5 text-white shadow-[var(--app-card-shadow)] sm:px-6 sm:py-6 ${isMaintenanceConfirmClosing ? "admin-confirm-modal--closing" : ""}`}>
          <div className="max-w-[18.5rem]">
            <h2 className="text-lg font-semibold leading-tight text-white sm:text-xl">{t("admin.operations.maintenanceTitle")}</h2>
            <p className="mt-3 text-sm font-medium leading-snug text-white/74 sm:text-[0.95rem]">{t("admin.confirm.enableMaintenance")}</p>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            <button type="button" onClick={closeMaintenanceConfirm} className="app-secondary-action inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{t("common.no")}</button>
            <button type="button" onClick={() => void confirmMaintenance()} className="rgb-hover-button inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{t("common.yes")}</button>
          </div>
        </div>
      </div>
    )}
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-4 sm:p-8">
      <div ref={scopeRef} data-route-transition-scope className="admin-operations-layout">
        <section data-admin-primary-card className={`admin-operations-card admin-operations-card--primary relative min-h-0 overflow-hidden bg-black p-6 text-white sm:p-8 ${primaryHidden ? "admin-primary-card--waiting" : ""}`}>
          <div data-admin-primary-content className="relative flex h-full min-h-0 flex-col">
          <div data-screen-reveal className="admin-command-header">
            <AdminPanelHeader title={t("admin.operations.title")} description={t("admin.operations.description")} />
          </div>

          <div data-screen-reveal className="admin-toggle-list mt-8">
            <AdminToggleRow
              title={t("admin.operations.multiplayerTitle")}
              description={t("admin.operations.multiplayerDescription")}
              checked={operations.multiplayerEnabled}
              disabled={!operationsReady || Boolean(operationBusy)}
              onClick={toggleMultiplayer}
              ariaLabel={t("admin.operations.multiplayerAria")}
            />
            <AdminToggleRow
              title={t("admin.operations.maintenanceTitle")}
              description={t("admin.operations.maintenanceDescription")}
              checked={operations.maintenanceEnabled}
              disabled={!operationsReady || Boolean(operationBusy)}
              onClick={toggleMaintenance}
              ariaLabel={t("admin.operations.maintenanceAria")}
              danger
            />
            <div className="flex items-center justify-between gap-5 border-t border-white/15 pt-5">
              <div className="min-w-0">
                <p className="text-base font-semibold">{t("admin.operations.cheatTitle")}</p>
                <p className="mt-1 text-sm text-white/55">{t("admin.operations.cheatDescription")}</p>
              </div>
              <AdminSwitch
                checked={cheatModeEnabled}
                disabled={!sessionValid}
                onClick={() => (cheatModeEnabled ? disableAdmin() : enableAdmin())}
                ariaLabel={t("admin.operations.cheatAria")}
              />
            </div>
          </div>
          </div>
        </section>

        <div data-admin-workspace-side className={`admin-operations-side admin-operations-side--${sidePhase}`}>
          <div className="admin-side-card-frame">
            <section className="admin-operations-card admin-operations-card--announcement admin-panel-card admin-action-card relative flex min-h-0 flex-col overflow-hidden bg-black p-6 text-white sm:p-8">
            <button
              type="button"
              aria-label={t("admin.common.back")}
              onClick={onClose}
              className="admin-panel-close absolute right-5 top-5 z-20 grid size-10 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X size={22} strokeWidth={1.8} />
            </button>
            <div data-screen-reveal className="admin-card-header flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="admin-workspace-title admin-workspace-title--secondary">{t("admin.operations.announcementTitle")}</h2>
                <p className="mt-3.5 max-w-[36.75rem] text-[0.92rem] font-medium leading-[1.28] text-white/65 sm:mt-4 sm:text-[0.98rem]">{t("admin.operations.announcementDescription")}</p>
              </div>
            </div>

            <div data-screen-reveal className="admin-card-body mt-8">
              <div className="admin-announcement-form flex gap-2">
              <input
                maxLength={280}
                type="text"
                value={announcement}
                onChange={(event) => setAnnouncement(event.target.value)}
                placeholder={t("admin.operations.announcementPlaceholder")}
                id="admin-announcement-input"
                aria-label={t("admin.operations.announcementPlaceholder")}
                className="card-control-frame card-action-height min-w-0 flex-1 px-5 text-[0.95rem] font-semibold text-white outline-none placeholder:text-white/34 focus:ring-2 focus:ring-white/18 sm:text-base"
              />
              <button
                type="button"
                disabled={!operationsReady || !announcement.trim() || Boolean(operationBusy)}
                onClick={publishAnnouncement}
                className="rgb-hover-button card-action-height inline-flex min-w-0 items-center justify-center rounded-full bg-white px-4 text-[0.95rem] font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 sm:text-base"
              >
                <span className="relative z-10">{t("admin.operations.send")}</span>
              </button>
              </div>
            </div>
            </section>
          </div>

          <div className="admin-side-card-frame">
            <section className="admin-operations-card admin-operations-card--cheat admin-panel-card admin-status-card flex min-h-0 flex-col overflow-hidden bg-black p-6 text-white sm:p-8">
              <div data-screen-reveal className="admin-card-header flex items-center justify-between gap-4">
                <div>
                  <h2 className="admin-workspace-title admin-workspace-title--compact">{t("admin.operations.currentAnnouncementTitle")}</h2>
                </div>
              </div>
              <div data-screen-reveal className="admin-card-body mt-5 flex min-h-0 flex-1 flex-col">
                {operations.announcement ? (
                  <div className="flex items-start justify-between gap-4 py-4">
                    <p className="min-w-0 text-[0.92rem] font-medium leading-[1.28] text-white/70 sm:text-[0.98rem]">
                      {operations.announcement.message}
                    </p>
                    <button
                      type="button"
                      disabled={!operationsReady || Boolean(operationBusy)}
                      onClick={clearAnnouncement}
                      className="shrink-0 text-xs font-semibold text-white/45 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-25"
                    >
                      {t("admin.operations.clearAnnouncement")}
                    </button>
                  </div>
                ) : (
                  <div className="admin-empty-state flex min-h-32 flex-1 items-center justify-center text-center">
                    <div className="admin-empty-state-inner max-w-xs">
                        <p className="text-[0.95rem] font-semibold text-white/65 sm:text-base">
                        {t("admin.operations.emptyAnnouncementTitle")}
                      </p>
                        <p className="mt-1 text-[0.78rem] font-medium text-white/35 sm:text-sm">
                        {t("admin.operations.emptyAnnouncementDescription")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

function AdminInsightsWorkspace({ scopeRef, sidePhase, primaryHidden, t, locale, summary, summaryAvailable, onClose }) {
  const live = summary?.live || {};
  const games = summary?.games || {};
  const values = [
    live.onlineVisitors,
    live.activePlayers,
    live.openLobbies,
    live.gamesInProgress,
    games.started24h,
    games.startedTotal,
  ].filter(Number.isFinite);
  const maxValue = Math.max(1, ...values);

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-4 sm:p-8">
      <div ref={scopeRef} data-route-transition-scope className="admin-operations-layout">
        <section data-admin-primary-card className={`admin-operations-card admin-operations-card--primary relative min-h-0 overflow-hidden bg-black p-6 text-white sm:p-8 ${primaryHidden ? "admin-primary-card--waiting" : ""}`}>
          <div data-admin-primary-content className="relative flex h-full min-h-0 flex-col">
          <button
            type="button"
            aria-label={t("admin.common.back")}
            onClick={onClose}
            className="absolute right-0 top-0 z-20 grid size-11 place-items-center rounded-full text-white/70 transition-opacity hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X size={25} strokeWidth={1.8} />
          </button>

          <AdminPanelHeader title={t("admin.insights.title")} description={t("admin.insights.description")} />

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
            <div data-screen-reveal className="insight-grid">
              <InsightBarRow label={t("admin.insights.online")} value={live.onlineVisitors} maxValue={maxValue} color="#34d399" />
              <InsightBarRow label={t("admin.insights.players")} value={live.activePlayers} maxValue={maxValue} color="#60a5fa" />
            </div>
            <div data-screen-reveal className="insight-grid">
              <InsightBarRow label={t("admin.insights.lobbies")} value={live.openLobbies} maxValue={maxValue} color="#fbbf24" />
              <InsightBarRow label={t("admin.insights.liveGames")} value={live.gamesInProgress} maxValue={maxValue} color="#f472b6" />
            </div>
            <div data-screen-reveal className="insight-grid">
              <InsightBarRow label={t("admin.insights.games24h")} value={games.started24h} maxValue={maxValue} color="#a78bfa" />
              <InsightBarRow label={t("admin.insights.gamesTotal")} value={games.startedTotal} maxValue={maxValue} color="#fb7185" />
            </div>
          </div>
          </div>
        </section>

        <div data-admin-workspace-side className={`admin-operations-side admin-operations-side--${sidePhase}`}>
          <div className="admin-side-card-frame">
            <FamilyPieCard
              className="admin-operations-card--announcement"
              t={t}
              live={live}
            />
          </div>

          <div className="admin-side-card-frame">
            <RecentGamesCard
              className="admin-operations-card--cheat"
              t={t}
              locale={locale}
              games={games.recent || []}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function InsightBarRow({ label, value, maxValue, color }) {
  const numericValue = Number.isFinite(value) ? value : 0;
  const width = Math.min(100, Math.max(0, (numericValue / maxValue) * 100));

  return (
    <div className="px-1 py-3.5">
      <div className="flex items-end justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/45">{label}</span>
        <strong className="text-2xl font-semibold leading-none tabular-nums text-white">{Number.isFinite(value) ? value : "–"}</strong>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function FamilyPieCard({ className, t, live }) {
  const palette = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6"];
  const metrics = [
    { key: "online", value: live.onlineVisitors },
    { key: "players", value: live.activePlayers },
    { key: "lobbies", value: live.openLobbies },
    { key: "liveGames", value: live.gamesInProgress },
  ].map((item) => ({ ...item, value: Number.isFinite(item.value) ? item.value : 0 }));
  const metricTotal = metrics.reduce((sum, item) => sum + item.value, 0);
  const { stops } = metrics.reduce((result, item, index) => {
    const end = result.cursor + (metricTotal > 0 ? (item.value / metricTotal) * 100 : 0);
    return {
      cursor: end,
      stops: [...result.stops, `${palette[index % palette.length]} ${result.cursor}% ${end}%`],
    };
  }, { cursor: 0, stops: [] });
  const background = stops.length ? `conic-gradient(${stops.join(", ")})` : "rgba(255,255,255,0.1)";

  return (
    <section className={`admin-operations-card admin-panel-card ${className} flex min-h-0 flex-col overflow-hidden bg-black text-white`}>
      <div data-screen-reveal>
        <h2 className="admin-workspace-title admin-workspace-title--secondary">{t("admin.insights.liveActivity")}</h2>
      </div>
      <div className="mt-5 flex min-h-0 items-center gap-5 sm:gap-6">
        <div data-screen-reveal className="shrink-0">
          <div className="relative size-28 rounded-full sm:size-32" style={{ background }}>
            <div className="absolute inset-[18%] grid place-content-center rounded-full bg-black text-center">
              <strong className="text-2xl font-semibold leading-none tabular-nums sm:text-3xl">{metricTotal}</strong>
              <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/40">{t("admin.insights.liveActivity")}</span>
            </div>
          </div>
        </div>
        <div data-screen-reveal className="min-w-0 flex-1">
          <div className="space-y-2">
            {metrics.map((item, index) => (
              <div key={item.key} className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="flex min-w-0 items-center gap-2 text-white/55">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} />
                  <span className="truncate">{t(`admin.insights.${item.key}`)}</span>
                </span>
                <strong className="tabular-nums text-white">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentGamesCard({ className, t, locale, games }) {
  const formatter = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className={`admin-operations-card admin-panel-card ${className} flex min-h-0 flex-col overflow-hidden bg-black text-white`}>
      <div data-screen-reveal>
        <h2 className="admin-workspace-title admin-workspace-title--secondary">{t("admin.insights.recentGames")}</h2>
        <p className="mt-3 text-[0.92rem] font-medium leading-[1.28] text-white/65 sm:text-[0.98rem]">{t("admin.insights.recentGamesDescription")}</p>
      </div>
      <div data-screen-reveal className="scrollbar-hidden mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {games.length ? games.map((game, index) => (
          <div key={`${game.roomCode}-${game.createdAt}-${index}`} className="flex items-center justify-between gap-4 border-b border-white/10 py-2.5 last:border-b-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t(`gameFamily.${game.gameFamily}`)}</p>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-white/35">{game.gameMode} · {game.playerCount} {t("admin.insights.playerUnit")}</p>
            </div>
            <time className="shrink-0 text-[10px] font-semibold tabular-nums text-white/40" dateTime={new Date(game.createdAt).toISOString()}>
              {formatter.format(new Date(game.createdAt))}
            </time>
          </div>
        )) : (
          <div className="admin-empty-state flex min-h-32 flex-1 items-center justify-center text-center">
            <div className="admin-empty-state-inner max-w-xs">
              <p className="text-[0.95rem] font-semibold text-white/65 sm:text-base">{t("admin.insights.noActivity")}</p>
              <p className="mt-1 text-[0.78rem] font-medium text-white/35 sm:text-sm">{t("admin.insights.recentGamesDescription")}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function formatUptime(seconds, t) {
  if (!Number.isFinite(seconds)) return "–";
  const totalMinutes = Math.floor(seconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days) return t("admin.insights.durationDays", { days, hours });
  if (hours) return t("admin.insights.durationHours", { hours, minutes });
  return t("admin.insights.durationMinutes", { minutes });
}

function AdminPanelHeader({ title, description }) {
  return (
    <div data-screen-reveal className="max-w-none pr-12">
      <h1 className="admin-workspace-title admin-workspace-title--primary whitespace-nowrap">
        {title}
      </h1>
      <p className="mt-3.5 max-w-[36.75rem] text-[0.92rem] font-medium leading-[1.28] text-white/82 sm:mt-4 sm:text-[0.98rem]">
        {description}
      </p>
    </div>
  );
}

function AdminNavigationRow({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-4 py-5 text-left text-white transition-colors hover:text-white/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:py-6"
    >
      <span className="min-w-0">
        <span className="block text-[0.95rem] font-semibold sm:text-base">{title}</span>
        <span className="mt-1.5 block truncate text-[0.92rem] font-medium leading-[1.28] text-white/55 sm:text-[0.98rem]">
          {description}
        </span>
      </span>
      <ArrowRight
        className="size-5 shrink-0 text-white/35 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white/70"
        strokeWidth={1.8}
      />
    </button>
  );
}

function DashboardValue({ label, value }) {
  return (
    <div>
      <p className="text-4xl font-semibold leading-none tabular-nums text-white">{Number.isFinite(value) ? value : "–"}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p>
    </div>
  );
}

function CompactValue({ label, value, bordered = false }) {
  return (
    <div className={bordered ? "border-l border-white/10 pl-4" : "pr-4"}>
      <p className="text-lg font-semibold tabular-nums text-white">{Number.isFinite(value) ? value : "–"}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">{label}</p>
    </div>
  );
}

function ActivityDonut({ label, started, completed, completedLabel }) {
  const startedValue = Number.isFinite(started) ? started : 0;
  const completedValue = Number.isFinite(completed) ? completed : 0;
  const ratio = startedValue > 0 ? Math.min(1, completedValue / startedValue) : 0;
  const circumference = 2 * Math.PI * 42;

  return (
    <section className="flex flex-col items-center justify-center rounded-[22px] bg-white/[0.055] p-3 text-center">
      <div className="relative size-28">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center">
          <strong className="text-3xl font-semibold leading-none tabular-nums">{Number.isFinite(started) ? started : "–"}</strong>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40">{label}</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-semibold text-white/45">
        {completedLabel} <span className="ml-1 text-white">{Number.isFinite(completed) ? completed : "–"}</span>
      </p>
    </section>
  );
}

function FooterMetric({ label, value }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="truncate text-sm font-semibold tabular-nums text-white">{Number.isFinite(value) ? value : value ?? "–"}</p>
      <p className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.09em] text-white/35">{label}</p>
    </div>
  );
}

function AdminToggleRow({
  title,
  description,
  checked,
  disabled,
  onClick,
  ariaLabel,
  danger = false,
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-t border-white/15 py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div>
        <p className={`text-[0.95rem] font-semibold sm:text-base ${danger && checked ? "text-red-300" : ""}`}>
          {title}
        </p>
        <p className="mt-1 text-[0.92rem] font-medium leading-[1.28] text-white/55 sm:text-[0.98rem]">{description}</p>
      </div>
      <AdminSwitch checked={checked} disabled={disabled} onClick={onClick} ariaLabel={ariaLabel} danger={danger} />
    </div>
  );
}

function AdminSwitch({ checked, disabled, onClick, ariaLabel, danger = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-8 w-14 shrink-0 rounded-full border-2 p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? danger
            ? "border-red-400 bg-red-400"
            : "border-white bg-white"
          : "border-white/50 bg-transparent"
      }`}
    >
      <span className={`block size-5 rounded-full transition-transform ${checked ? "translate-x-6 bg-black" : "translate-x-0 bg-white/60"}`} />
    </button>
  );
}
