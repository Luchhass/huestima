"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, trackPageView } from "@/lib/analytics";

function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

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
    </>
  );
}
