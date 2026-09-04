"use client";

import { useEffect, useState } from "react";
import PushNotification from "@/components/ui/PushNotification";
import AnnouncementModal from "@/components/ui/AnnouncementModal";
import { markNotificationRead } from "@/lib/notificationInbox";

const PUSH_EVENT = "huestima-push-notification";
const ANNOUNCEMENT_INTRO_DELAY = 2400;

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
  const [announcement, setAnnouncement] = useState(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);

  useEffect(() => {
    const handleNotification = async (event) => {
      if (!event.detail?.message) return;
      if (event.detail.variant === "announcement") {
        if (event.detail.waitForIntro) {
          await waitForAnnouncementIntro();
        }
        setAnnouncement(event.detail);
        setAnnouncementOpen(true);
        return;
      }
      setNotification(event.detail);
    };

    window.addEventListener(PUSH_EVENT, handleNotification);
    return () => window.removeEventListener(PUSH_EVENT, handleNotification);
  }, []);

  return (
    <>
      <AnnouncementModal
        message={announcement?.message || ""}
        open={announcementOpen}
        onClose={() => {
          markNotificationRead(announcement?.announcementId);
          setAnnouncementOpen(false);
        }}
      />
      <PushNotification
        notification={notification}
        onClose={() => setNotification(null)}
        durationMs={notification?.durationMs}
      />
    </>
  );
}
