"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const ADMIN_TAP_WINDOW_MS = 5000;
const ADMIN_TAP_COUNT = 5;
const ADMIN_SETTLE_DELAY_MS = 3000;

const AdminModeContext = createContext(null);

function AdminHotCorner() {
  const { enabled, disableAdmin, requestProtector } = useAdminMode();
  const tapTimesRef = useRef([]);
  const settleTimerRef = useRef(null);

  useEffect(() => {
    const clearSettleTimer = () => {
      if (!settleTimerRef.current) return;

      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    };

    const handlePointerDown = (event) => {
      const viewportWidth =
        window.visualViewport?.width || document.documentElement.clientWidth;
      const viewportHeight =
        window.visualViewport?.height || document.documentElement.clientHeight;
      const viewportLeft = window.visualViewport?.offsetLeft || 0;
      const viewportTop = window.visualViewport?.offsetTop || 0;
      const localX = event.clientX - viewportLeft;
      const localY = event.clientY - viewportTop;

      if (localX < viewportWidth - 80 || localY < viewportHeight - 80) {
        return;
      }

      clearSettleTimer();

      const now = Date.now();
      tapTimesRef.current = [...tapTimesRef.current, now].filter(
        (time) => now - time <= ADMIN_TAP_WINDOW_MS,
      );

      if (tapTimesRef.current.length < ADMIN_TAP_COUNT) return;

      tapTimesRef.current = [];

      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;

        if (enabled) {
          disableAdmin();
          return;
        }

        requestProtector();
      }, ADMIN_SETTLE_DELAY_MS);
    };

    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      clearSettleTimer();
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [disableAdmin, enabled, requestProtector]);

  return null;
}

export function AdminModeProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const [protectorRequestId, setProtectorRequestId] = useState(0);
  const [pendingUnlock, setPendingUnlock] = useState(false);

  const requestProtector = useCallback(() => {
    if (!document.querySelector(".home-card")) {
      setPendingUnlock(true);
      return;
    }

    setProtectorRequestId((requestId) => requestId + 1);
  }, []);

  const enableAdmin = useCallback(() => {
    setEnabled(true);
    setPendingUnlock(false);
  }, []);

  const cancelUnlockRequest = useCallback(() => {
    setPendingUnlock(false);
  }, []);

  const disableAdmin = useCallback(() => {
    setEnabled(false);
    setPendingUnlock(false);
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      pendingUnlock,
      protectorRequestId,
      requestProtector,
      enableAdmin,
      cancelUnlockRequest,
      disableAdmin,
    }),
    [
      cancelUnlockRequest,
      disableAdmin,
      enableAdmin,
      enabled,
      pendingUnlock,
      protectorRequestId,
      requestProtector,
    ],
  );

  return (
    <AdminModeContext.Provider value={value}>
      {children}
      <AdminHotCorner />
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const context = useContext(AdminModeContext);

  if (!context) {
    throw new Error("useAdminMode must be used inside AdminModeProvider");
  }

  return context;
}
