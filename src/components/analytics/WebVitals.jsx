"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/lib/analytics";

function report(metric) {
  if (!["LCP", "INP", "CLS"].includes(metric.name)) return;
  trackEvent("web_vital", {
    metric_name: metric.name, metric_value: metric.value,
    metric_rating: metric.rating, metric_id: metric.id,
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    non_interaction: true,
  });
}

export default function WebVitals() {
  useReportWebVitals(report);
  return null;
}
