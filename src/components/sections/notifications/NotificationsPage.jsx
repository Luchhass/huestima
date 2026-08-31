"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCheck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { playScreenFadeOut, useScreenReveal } from "@/hooks/useScreenReveal";
import { useSiteOperations } from "@/hooks/useSiteOperations";
import { useTranslation } from "@/hooks/useLanguage";
import { readNotificationInbox } from "@/lib/notificationInbox";
import { pushNotification } from "@/components/ui/GlobalPushNotifications";
import EmptyState from "@/components/ui/EmptyState";

function formatNotificationDate(value, locale) {
  if (!Number.isFinite(Number(value))) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(value)));
}

export default function NotificationsPage() {
  const scopeRef = useRef(null);
  const isClosingRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const cardHeight = useResponsiveCardHeight(isExpanded);
  const { announcements } = useSiteOperations();
  const { locale, t } = useTranslation();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsExpanded(true), 40);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useScreenReveal(scopeRef, [announcements.length, locale], { delay: 240 });

  const readIds = readNotificationInbox().readIds;
  const requestedReturnTo = searchParams.get("from") || "/color";
  const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/color";

  const handleClose = async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);

    await playScreenFadeOut(scopeRef, { duration: 0.24 });
    setIsExpanded(false);
    await new Promise((resolve) => window.setTimeout(resolve, 760));
    router.push(returnTo);
  };

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <section
        data-intro-card-target
        data-notification-card
        className="relative flex w-full max-w-125 flex-col overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[var(--app-card-shadow)] transition-[height] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] sm:rounded-[26px] sm:p-8"
        style={cardHeight ? { height: cardHeight } : undefined}
      >
        <button
          type="button"
          onClick={() => void handleClose()}
          aria-label={t("notifications.close")}
          className="solo-close-button absolute right-4 top-4 z-30 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50 sm:right-8 sm:top-8 sm:size-9"
          disabled={isClosing}
        >
          <X className="size-6 sm:size-[26px]" strokeWidth={1.7} />
        </button>
        <div ref={scopeRef} data-route-transition-scope className="relative flex h-full min-h-0 flex-col">
          <div data-screen-reveal className="overflow-hidden">
              <div className="flex items-start justify-between gap-5">
                <div>
                <h1 className="mt-3 text-[clamp(2.55rem,7vw,4.8rem)] font-semibold leading-[0.88] tracking-[-0.065em]">{t("notifications.title")}</h1>
                </div>
            </div>
          </div>

          <div data-screen-reveal className="mt-5 overflow-hidden">
            <p className="max-w-[35rem] text-sm font-medium leading-[1.4] text-white/68 sm:text-base">{t("notifications.description")}</p>
          </div>

          <div data-screen-reveal className="mt-6 min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-1">
              {announcements.length ? (
                <div className="border-y border-white/[0.14]">
                  {announcements.map((announcement) => {
                    const unread = !readIds.includes(announcement.id);
                    return (
                      <button
                        type="button"
                        key={announcement.id}
                        onClick={() => pushNotification(announcement.message, "announcement", undefined, {
                          announcementId: announcement.id,
                        })}
                        className="block w-full border-b border-white/[0.14] py-5 text-left last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-[0.95rem] font-semibold text-white/90">{t("notifications.newNotification")}</p>
                          <div className="flex shrink-0 items-center gap-2 text-[0.7rem] font-medium text-white/48">
                            {formatNotificationDate(announcement.createdAt, locale)}
                            {unread && <span className="ml-1 size-1.5 rounded-full bg-[#83dcff]" aria-label={t("notifications.unread")} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCheck}
                  title={t("notifications.emptyTitle")}
                  description={t("notifications.emptyDescription")}
                  className="rounded-[22px] border border-dashed border-white/15"
                />
              )}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
