import { db } from "@/database/client";
import { env } from "@/lib/env";
import type { AnalyticsEvent, AnalyticsProps } from "./events";

/**
 * Server-side analytics. Events are stored in our own database (the admin
 * dashboard reads them). If ANALYTICS_KEY is set, plug a forwarder in `forward`.
 * Never throws — analytics must not break gameplay.
 */
export async function track(name: AnalyticsEvent, props: AnalyticsProps = {}, userId?: string | null): Promise<void> {
  try {
    await db.analyticsEvent.create({ data: { name, userId: userId ?? null, props } });
    if (env.analyticsKey) await forward(name, props, userId);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[analytics] failed", name, (e as Error).message);
  }
}

async function forward(name: string, props: AnalyticsProps, userId?: string | null): Promise<void> {
  // Integration point for an external provider (PostHog, Plausible, …).
  void name;
  void props;
  void userId;
}
