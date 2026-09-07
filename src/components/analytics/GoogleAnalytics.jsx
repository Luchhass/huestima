"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, trackPageView } from "@/lib/analytics";
import WebVitals from "./WebVitals";

function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastLocation = useRef("");

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || pathname.startsWith("/admin")) return;

    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

    // React Strict Mode must not count the same navigation twice.
    if (lastLocation.current === pagePath) return;
    lastLocation.current = pagePath;
    trackPageView({
      pagePath,
      pageLocation: window.location.href,
      pageTitle: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          if (!window.__huestimaGaConfigured) {
            gtag("js", new Date());
            gtag("config", "${GA_MEASUREMENT_ID}", { send_page_view: false });
            window.__huestimaGaConfigured = true;
          }
        `}
      </Script>
      <Script
        id="google-analytics-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsPageView />
      </Suspense>
      <WebVitals />
    </>
  );
}
