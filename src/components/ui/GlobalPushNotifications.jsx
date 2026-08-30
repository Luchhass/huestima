"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import PushNotification from "@/components/ui/PushNotification";
import AnnouncementModal from "@/components/ui/AnnouncementModal";
import { markNotificationRead } from "@/lib/notificationInbox";

const PUSH_EVENT = "huestima-push-notification";
const APP_SURFACE_SELECTOR = ".app-header, main, .route-transition-footer, .creator-tag, .fullscreen-escape-button";
const ANNOUNCEMENT_INTRO_DELAY = 2400;
const ANNOUNCEMENT_FADE_DURATION = 0.36;

function getAppSurfaces() {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll(APP_SURFACE_SELECTOR));
}

function animateAppSurfaces(autoAlpha) {
  const surfaces = getAppSurfaces();
  if (!surfaces.length) return Promise.resolve();

  // Route reveals can still own opacity tweens on the same frame. Stop those
  // first so every visible app surface follows this single timeline.
  gsap.killTweensOf(surfaces);

  return new Promise((resolve) => {
    gsap.to(surfaces, {
      autoAlpha,
      duration: ANNOUNCEMENT_FADE_DURATION,
      ease: "power2.out",
      overwrite: true,
      onComplete: resolve,
      onInterrupt: resolve,
    });
  });
}

function waitForAnnouncementIntro() {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    let completed = false;
    let fallbackId = null;
    let delayId = null;

    const finish = () => {
      if (completed) return;
      completed = true;
      window.removeEventListener("page-intro:complete", handleIntroComplete);
      if (fallbackId) window.clearTimeout(fallbackId);
      delayId = window.setTimeout(resolve, ANNOUNCEMENT_INTRO_DELAY);
    };

    const handleIntroComplete = () => finish();
    const introIsRunning =
      window.__pageIntroDoneForPath !== window.location.pathname &&
      (document.documentElement.dataset.pageIntroPending === "true" ||
        Boolean(document.querySelector("[data-page-intro-overlay]")));

    if (!introIsRunning) {
      resolve();
      return;
    }

    window.addEventListener("page-intro:complete", handleIntroComplete, { once: true });
    fallbackId = window.setTimeout(finish, 7200);
  });
}

export function pushNotification(message, variant = "success", durationMs, options = {}) {
  if (typeof window === "undefined" || !message) return;

  window.dispatchEvent(
    new CustomEvent(PUSH_EVENT, {
      detail: {
        id: `${variant}-${Date.now()}`,
        message,
        variant,
        durationMs,
        ...options,
      },
    }),
  );
}

export default function GlobalPushNotifications() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleNotification = async (event) => {
      if (!event.detail?.message) return;
      if (event.detail.variant === "announcement") {
        if (event.detail.waitForIntro) {
          await waitForAnnouncementIntro();
        }
        await animateAppSurfaces(0);
      }
      setNotification(event.detail);
    };

    window.addEventListener(PUSH_EVENT, handleNotification);
    return () => window.removeEventListener(PUSH_EVENT, handleNotification);
  }, []);

  return (
    notification?.variant === "announcement" ? (
      <AnnouncementModal
        message={notification.message}
        onClose={() => {
          markNotificationRead(notification.announcementId);
          setNotification(null);
          void animateAppSurfaces(1);
        }}
      />
    ) : (
      <PushNotification notification={notification} onClose={() => setNotification(null)} durationMs={notification?.durationMs} />
    )
  );
}
