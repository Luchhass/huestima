"use client";

import { useEffect, useState } from "react";
import PushNotification from "@/components/ui/PushNotification";
import AnnouncementModal from "@/components/ui/AnnouncementModal";

const PUSH_EVENT = "huestima-push-notification";

export function pushNotification(message, variant = "success", durationMs) {
  if (typeof window === "undefined" || !message) return;

  window.dispatchEvent(
    new CustomEvent(PUSH_EVENT, {
      detail: {
        id: `${variant}-${Date.now()}`,
        message,
        variant,
        durationMs,
      },
    }),
  );
}

export default function GlobalPushNotifications() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleNotification = (event) => {
      if (!event.detail?.message) return;
      setNotification(event.detail);
    };

    window.addEventListener(PUSH_EVENT, handleNotification);
    return () => window.removeEventListener(PUSH_EVENT, handleNotification);
  }, []);

  return (
    notification?.variant === "announcement" ? (
      <AnnouncementModal message={notification.message} onClose={() => setNotification(null)} />
    ) : (
      <PushNotification notification={notification} onClose={() => setNotification(null)} durationMs={notification?.durationMs} />
    )
  );
}
