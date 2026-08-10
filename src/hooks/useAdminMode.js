"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AdminModeContext = createContext(null);

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
