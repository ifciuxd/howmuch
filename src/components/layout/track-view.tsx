"use client";

import { useEffect } from "react";
import { trackClient } from "@/analytics/client";
import type { AnalyticsEvent, AnalyticsProps } from "@/analytics/events";

export function TrackView({ event, props }: { event: AnalyticsEvent; props?: AnalyticsProps }) {
  useEffect(() => {
    trackClient(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
