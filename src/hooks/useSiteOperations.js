"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { pushNotification } from "@/components/ui/GlobalPushNotifications";
import { playScreenFadeOut } from "@/hooks/useScreenReveal";
import { getSocket } from "@/lib/socket";
import {
  NOTIFICATION_INBOX_CHANGE_EVENT,
  markAllNotificationsRead,
  markNotificationSeen,
  readNotificationInbox,
} from "@/lib/notificationInbox";

const API_ROOT = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
const FAMILY_PATHS = new Set(["color", "flag", "cartoon", "brand", "team"]);
const DEFAULT_OPERATIONS = {
  maintenanceEnabled: false,
  multiplayerEnabled: true,
  announcement: null,
  updatedAt: 0,
  gameConfiguration: {},
};

const SiteOperationsContext = createContext({
  operations: DEFAULT_OPERATIONS,
  announcements: [],
  unreadAnnouncementCount: 0,
  markAllAnnouncementsRead: () => {},
  ready: false,
});

function multiplayerFallbackPath(pathname) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "play" && segments[1] === "multiplayer") {
    return "/color";
  }

  if (
    FAMILY_PATHS.has(segments[0]) &&
    (segments[1] === "multiplayer" || /^\d{6}$/.test(segments[1] || ""))
  ) {
    return `/${segments[0]}`;
  }

  return null;
}

function isAnnouncementHomePath(pathname) {
  return FAMILY_PATHS.has(pathname?.replace(/^\//, ""));
}

export function SiteOperationsProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [operations, setOperations] = useState(DEFAULT_OPERATIONS);
  const [announcements, setAnnouncements] = useState([]);
  const [inbox, setInbox] = useState(readNotificationInbox);
  const [ready, setReady] = useState(false);
  const shownAnnouncementsRef = useRef(new Set());
  const redirectingRef = useRef(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    redirectingRef.current = false;
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let active = true;
    const socket = getSocket();

    const showAnnouncement = (announcement) => {
      if (!announcement?.id || !announcement.message) return;
      if (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) return;
      if (!isAnnouncementHomePath(pathnameRef.current)) return;

      const inbox = readNotificationInbox();
      if (shownAnnouncementsRef.current.has(announcement.id)) return;
      if (inbox.seenIds.includes(announcement.id) || inbox.readIds.includes(announcement.id)) return;

      shownAnnouncementsRef.current.add(announcement.id);
      markNotificationSeen(announcement.id);
      pushNotification(announcement.message, "announcement", undefined, {
        announcementId: announcement.id,
        waitForIntro: true,
      });
    };

    const applyOperations = (nextOperations) => {
      if (!active || !nextOperations) return;
      setOperations(nextOperations);
      setReady(true);
      showAnnouncement(nextOperations.announcement);
    };

    const handleAnnouncement = (announcement) => {
      if (!active) return;
      setAnnouncements((current) => [
        announcement,
        ...current.filter((item) => item.id !== announcement?.id),
      ].slice(0, 50));
      showAnnouncement(announcement);
    };

    const handleAnnouncementDeleted = ({ id }) => {
      if (!active || !id) return;
      setAnnouncements((current) => current.filter((item) => item.id !== id));
      setOperations((current) => current.announcement?.id === id
        ? { ...current, announcement: null }
        : current);
    };

    socket?.on("operations:state", applyOperations);
    socket?.on("operations:announcement", handleAnnouncement);
    socket?.on("operations:announcement-deleted", handleAnnouncementDeleted);

    fetch(`${API_ROOT}/api/operations`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Operations state is unavailable.");
        const data = await response.json();
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
        applyOperations(data.operations);
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
      socket?.off("operations:state", applyOperations);
      socket?.off("operations:announcement", handleAnnouncement);
      socket?.off("operations:announcement-deleted", handleAnnouncementDeleted);
    };
  }, []);

  useEffect(() => {
    const syncInbox = () => setInbox(readNotificationInbox());
    window.addEventListener(NOTIFICATION_INBOX_CHANGE_EVENT, syncInbox);
    window.addEventListener("storage", syncInbox);
    return () => {
      window.removeEventListener(NOTIFICATION_INBOX_CHANGE_EVENT, syncInbox);
      window.removeEventListener("storage", syncInbox);
    };
  }, []);

  useEffect(() => {
    if (!ready || redirectingRef.current) return;

    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
    let destination = null;

    if (operations.maintenanceEnabled && !isAdminPath && pathname !== "/maintenance") {
      destination = "/maintenance";
    } else if (!operations.maintenanceEnabled && pathname === "/maintenance") {
      destination = "/color";
    } else if (operations.gameConfiguration?.[pathname.split("/").filter(Boolean)[0]]?.enabled === false) {
      destination = "/color";
    } else if (!operations.multiplayerEnabled) {
      destination = multiplayerFallbackPath(pathname);
    }

    if (!destination || destination === pathname) return;
    redirectingRef.current = true;

    const scope =
      document.querySelector("[data-route-transition-scope]") ||
      document.querySelector("[data-intro-card-target]") ||
      document.querySelector("main");

    const chrome = Array.from(document.querySelectorAll(
      ".app-header, .creator-tag, .route-transition-footer",
    ));
    void Promise.all([
      playScreenFadeOut(scope, { duration: 0.24 }),
      ...chrome.map((element) => playScreenFadeOut(element, { duration: 0.24 })),
    ]).finally(() => {
      router.replace(destination);
    });
  }, [operations.gameConfiguration, operations.maintenanceEnabled, operations.multiplayerEnabled, pathname, ready, router]);

  const unreadAnnouncementCount = announcements.filter(
    (announcement) => !inbox.readIds.includes(announcement.id),
  ).length;

  const markAllAnnouncementsRead = useCallback(() => {
    markAllNotificationsRead(announcements.map((announcement) => announcement.id));
  }, [announcements]);

  const value = useMemo(
    () => ({
      operations,
      announcements,
      unreadAnnouncementCount,
      markAllAnnouncementsRead,
      ready,
    }),
    [announcements, markAllAnnouncementsRead, operations, ready, unreadAnnouncementCount],
  );

  return (
    <SiteOperationsContext.Provider value={value}>
      {children}
    </SiteOperationsContext.Provider>
  );
}

export function useSiteOperations() {
  return useContext(SiteOperationsContext);
}
