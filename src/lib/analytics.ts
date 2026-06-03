// Lightweight analytics: page-view + custom events. No external SDK.
// Sends to /api/public/analytics if available; otherwise no-op in dev.
export function trackEvent(name: string, props?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    const payload = {
      name,
      props: props ?? {},
      path: window.location.pathname + window.location.search,
      ts: Date.now(),
      ref: document.referrer || null,
    };
    // Best-effort beacon; ignore failures.
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon("/api/public/analytics", blob);
    }
  } catch {
    // swallow
  }
}

export function trackPageView() {
  trackEvent("page_view");
}
