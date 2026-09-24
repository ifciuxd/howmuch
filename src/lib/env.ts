/**
 * Typed access to configuration. Secrets stay server-side; only NEXT_PUBLIC_* reach the browser.
 */

function bool(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

function int(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  get appUrl(): string {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get authSecret(): string {
    const s = process.env.AUTH_SECRET;
    if (!s) {
      if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
      return "howmuch-dev-secret";
    }
    return s;
  },
  get googleAuthEnabled(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },
  get emailServer(): string | undefined {
    return process.env.EMAIL_SERVER || undefined;
  },
  get emailFrom(): string {
    return process.env.EMAIL_FROM || "HOWMUCH? <play@localhost>";
  },
  /** Instant dev sign-in. Hard-disabled in production builds. */
  get devLoginEnabled(): boolean {
    return process.env.NODE_ENV !== "production" && bool(process.env.AUTH_DEV_LOGIN);
  },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  get stripeSecretKey(): string | undefined {
    return process.env.STRIPE_SECRET_KEY || undefined;
  },
  get stripeWebhookSecret(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET || undefined;
  },
  get paymentsProvider(): "stripe" | "mock" | "none" {
    const p = process.env.PAYMENTS_PROVIDER?.toLowerCase();
    if (p === "mock") return process.env.NODE_ENV === "production" ? "none" : "mock";
    if (p === "stripe" || (!p && process.env.STRIPE_SECRET_KEY)) return process.env.STRIPE_SECRET_KEY ? "stripe" : "none";
    return "none";
  },
  get aiApiKey(): string | undefined {
    return process.env.AI_API_KEY || undefined;
  },
  get aiModel(): string {
    return process.env.AI_MODEL || "claude-haiku-4-5";
  },
  get analyticsKey(): string | undefined {
    return process.env.ANALYTICS_KEY || undefined;
  },
  get freeQuickGamesPerDay(): number {
    return Math.max(1, int(process.env.FREE_QUICK_GAMES_PER_DAY, 10));
  },
  /** Contact shown in the importer's User-Agent so site owners can reach us. */
  get importerContact(): string {
    return process.env.IMPORTER_CONTACT || `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/about#sources`;
  },
};
