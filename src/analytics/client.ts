"use client";

import type { AnalyticsEvent, AnalyticsProps } from "./events";

/** Fire-and-forget client event. Uses sendBeacon so navigation never waits on it. */
export function trackClient(name: AnalyticsEvent, props: AnalyticsProps = {}): void {
  try {
    const body = JSON.stringify({ name, props });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    /* analytics must never break the game */
  }
}
