/** Every product analytics event. Keep names stable — dashboards depend on them. */
export const ANALYTICS_EVENTS = [
  "home_viewed",
  "game_started",
  "round_started",
  "guess_submitted",
  "round_completed",
  "game_completed",
  "daily_started",
  "daily_completed",
  "share_clicked",
  "signup_started",
  "signup_completed",
  "payment_started",
  "payment_completed",
  "image_failed",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(name: string): name is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(name);
}

/** Only small, non-personal properties are accepted. */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

export function sanitizeProps(input: unknown): AnalyticsProps {
  const out: AnalyticsProps = {};
  if (!input || typeof input !== "object") return out;
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= 12 || !/^[a-zA-Z0-9_]{1,40}$/.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 120);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean" || v === null) out[k] = v;
    else continue;
    n++;
  }
  return out;
}
