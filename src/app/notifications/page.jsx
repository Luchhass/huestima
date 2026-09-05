import { Suspense } from "react";
import NotificationsPage from "@/components/sections/notifications/NotificationsPage";

export const metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

function NotificationsRouteFallback() {
  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        aria-hidden="true"
        className="w-full max-w-125 rounded-[24px] bg-black shadow-[var(--app-card-shadow)] sm:rounded-[26px]"
        style={{ height: "clamp(20rem, calc(100dvh - 8rem), 24.375rem)" }}
      />
    </main>
  );
}

export default function NotificationsRoute() {
  return (
    <Suspense fallback={<NotificationsRouteFallback />}>
      <NotificationsPage />
    </Suspense>
  );
}
