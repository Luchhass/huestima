"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import {
  playScreenFadeOut,
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import {
  consumeCardRouteTransition,
  CARD_RESIZE_DURATION_MS,
  markDownloadReturn,
  SCREEN_REVEAL_AFTER_RESIZE_MS,
  SCREEN_REVEAL_DIRECT_MS,
} from "@/hooks/useFooterPageTransition";
import { useSiteOperations } from "@/hooks/useSiteOperations";
import { useTranslation } from "@/hooks/useLanguage";
import { readNotificationInbox } from "@/lib/notificationInbox";
import { pushNotification } from "@/components/ui/GlobalPushNotifications";
import EmptyState from "@/components/ui/EmptyState";
import CardCloseButton from "@/components/ui/CardCloseButton";

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
  const [entryTransition] = useState(consumeCardRouteTransition);
  const skipsEntryResize = ["large", "download"].includes(entryTransition?.from);
  const [isExpanded, setIsExpanded] = useState(skipsEntryResize);
  const [isClosing, setIsClosing] = useState(false);
  const cardHeight = useResponsiveCardHeight(isExpanded);
  const { announcements } = useSiteOperations();
  const { locale, t } = useTranslation();

  useEffect(() => {
    const expandTimeoutId = skipsEntryResize
      ? null
      : window.setTimeout(() => setIsExpanded(true), 40);
    const revealTimeoutId = window.setTimeout(() => {
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    }, skipsEntryResize ? SCREEN_REVEAL_DIRECT_MS : SCREEN_REVEAL_AFTER_RESIZE_MS);
    return () => {
      if (expandTimeoutId) window.clearTimeout(expandTimeoutId);
      window.clearTimeout(revealTimeoutId);
    };
  }, [skipsEntryResize]);

  useScreenReveal(scopeRef, [locale], { defer: true });

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
    await new Promise((resolve) => window.setTimeout(resolve, CARD_RESIZE_DURATION_MS));
    markDownloadReturn();
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
        <div ref={scopeRef} data-route-transition-scope className="relative flex h-full min-h-0 w-full flex-col">
          <CardCloseButton
            onClick={() => void handleClose()}
            label={t("notifications.close")}
            disabled={isClosing}
            className="absolute right-0 top-0"
          />
          <div data-screen-reveal className="overflow-hidden pr-12">
            <h1 className="whitespace-nowrap text-[clamp(2.3rem,7vw,3.75rem)] font-semibold leading-[0.92] tracking-normal text-white sm:text-[3.85rem]">{t("notifications.title")}</h1>
          </div>

          <div data-screen-reveal className="scrollbar-hidden mt-8 min-h-0 flex-1 overflow-y-auto">
            <div className="h-full overflow-y-auto">
              {announcements.length ? (
                <div className="space-y-0">
                  {announcements.map((announcement) => {
                    const unread = !readIds.includes(announcement.id);
                    return (
                      <button
                        type="button"
                        key={announcement.id}
                        onClick={() => pushNotification(announcement.message, "announcement", undefined, {
                          announcementId: announcement.id,
                        })}
                        className="block w-full border-b border-white/10 py-4 text-left last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:py-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="min-w-0 truncate text-[1.02rem] font-semibold leading-none text-white sm:text-[1.1rem]">{t("notifications.newNotification")}</p>
                          <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-white/46 sm:text-sm">
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
                  className="w-full items-center px-6 text-center"
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
