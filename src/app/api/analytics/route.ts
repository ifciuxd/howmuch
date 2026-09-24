import { NextResponse } from "next/server";
import { isAnalyticsEvent, sanitizeProps } from "@/analytics/events";
import { track } from "@/analytics/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/services/user-service";

/** Client events (page views, share clicks…). Game events are tracked server-side. */
const CLIENT_EVENTS = new Set(["home_viewed", "share_clicked", "signup_started", "payment_started", "round_started"]);

export async function POST(req: Request) {
  if (!rateLimit(`an:${clientIp(req.headers)}`, 60, 60_000).ok) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || !isAnalyticsEvent(name) || !CLIENT_EVENTS.has(name)) return new NextResponse(null, { status: 204 });
  const user = await getCurrentUser().catch(() => null);
  await track(name, sanitizeProps((body as { props?: unknown }).props), user?.id);
  return new NextResponse(null, { status: 204 });
}
