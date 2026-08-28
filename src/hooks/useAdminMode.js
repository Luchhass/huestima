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
import { adminRequest } from "@/lib/adminApi";

const AdminModeContext = createContext(null);
const ADMIN_MODE_STORAGE_KEY = "huestima-admin-cheat-mode";

function readPersistedAdminMode() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ADMIN_MODE_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function AdminModeProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const validationRequestRef = useRef(0);

  const clearPersistedMode = useCallback(() => {
    try { window.sessionStorage.removeItem(ADMIN_MODE_STORAGE_KEY); } catch {}
  }, []);

  const refreshSession = useCallback(async () => {
    const requestId = validationRequestRef.current + 1;
    validationRequestRef.current = requestId;

    try {
      const response = await adminRequest("/me");

      // Ignore a slower response from an older check (for example, the
      // provider's initial 401 completing after the admin page's refresh).
      if (requestId !== validationRequestRef.current) return false;

      if (response.ok) {
        setSessionValid(true);
        setEnabled(readPersistedAdminMode());
        return true;
      }

      setSessionValid(false);
      setEnabled(false);
      clearPersistedMode();
      return false;
    } catch {
      if (requestId !== validationRequestRef.current) return false;

      setSessionValid(false);
      setEnabled(false);
      clearPersistedMode();
      return false;
    }
  }, [clearPersistedMode]);

  useEffect(() => {
    // The initial check intentionally synchronizes the provider with the
    // server session as soon as the app mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
    const intervalId = window.setInterval(() => {
      void refreshSession();
    }, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [refreshSession]);

  const enableAdmin = useCallback(() => {
    if (!sessionValid) return;
    setEnabled(true);
    try { window.sessionStorage.setItem(ADMIN_MODE_STORAGE_KEY, "on"); } catch {}
  }, [sessionValid]);

  const disableAdmin = useCallback(() => {
    setEnabled(false);
    try { window.sessionStorage.removeItem(ADMIN_MODE_STORAGE_KEY); } catch {}
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      sessionValid,
      enableAdmin,
      disableAdmin,
      refreshSession,
    }),
    [
      disableAdmin,
      enableAdmin,
      enabled,
      refreshSession,
      sessionValid,
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
