import { ALLOW_ALL, DISALLOW_ALL, type RobotsPolicy, robotsPolicy } from "./robots";

/**
 * A deliberately polite HTTP client for importing public listings.
 *
 *  • identifies itself honestly (User-Agent with a contact URL)
 *  • obeys robots.txt (unreachable robots.txt ⇒ treated as "disallow all")
 *  • one request at a time per host, with a minimum delay (or the site's Crawl-delay if longer)
 *  • never retries around blocks: 401/403/429, captcha or bot-challenge pages stop the import
 *  • no cookies, no login, no header spoofing, no proxies
 */

export const USER_AGENT_TOKEN = "HOWMUCHbot";

export class ImportBlockedError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly reason: "robots" | "blocked" | "challenge" | "http" | "network",
  ) {
    super(message);
    this.name = "ImportBlockedError";
  }
}

export interface PoliteFetcherOptions {
  contact: string;
  minDelayMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const CHALLENGE_MARKERS = [
  "captcha",
  "cf-challenge",
  "challenge-platform",
  "datadome",
  "px-captcha",
  "are you a robot",
  "verify you are human",
  "access denied",
];

export class PoliteFetcher {
  private robots = new Map<string, Promise<RobotsPolicy>>();
  private nextSlot = new Map<string, number>();
  private readonly userAgent: string;
  private readonly minDelayMs: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(opts: PoliteFetcherOptions) {
    this.userAgent = `${USER_AGENT_TOKEN}/1.0 (+${opts.contact})`;
    this.minDelayMs = opts.minDelayMs ?? 4000;
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = opts.now ?? Date.now;
  }

  private async policyFor(origin: string): Promise<RobotsPolicy> {
    let p = this.robots.get(origin);
    if (!p) {
      p = this.loadRobots(origin);
      this.robots.set(origin, p);
    }
    return p;
  }

  private async loadRobots(origin: string): Promise<RobotsPolicy> {
    try {
      const res = await this.rawGet(`${origin}/robots.txt`);
      if (res.status >= 400 && res.status < 500) return ALLOW_ALL;
      if (!res.ok) return DISALLOW_ALL;
      return robotsPolicy(await res.text(), USER_AGENT_TOKEN);
    } catch {
      return DISALLOW_ALL;
    }
  }

  private async waitTurn(host: string, crawlDelaySeconds?: number) {
    const delay = Math.max(this.minDelayMs, (crawlDelaySeconds ?? 0) * 1000);
    const slot = this.nextSlot.get(host) ?? 0;
    const now = this.now();
    const start = Math.max(now, slot);
    this.nextSlot.set(host, start + delay);
    if (start > now) await this.sleep(start - now);
  }

  private async rawGet(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        headers: { "User-Agent": this.userAgent, Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5" },
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Can we fetch this URL at all? (robots.txt only — no request to the page itself) */
  async isAllowed(url: string): Promise<boolean> {
    const u = new URL(url);
    const policy = await this.policyFor(u.origin);
    return policy.isAllowed(u.pathname + u.search);
  }

  async getText(url: string): Promise<{ url: string; html: string }> {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new ImportBlockedError("Only http(s) URLs are supported", url, "http");
    const policy = await this.policyFor(u.origin);
    if (!policy.isAllowed(u.pathname + u.search)) {
      throw new ImportBlockedError(`robots.txt of ${u.host} does not allow ${u.pathname}`, url, "robots");
    }
    await this.waitTurn(u.host, policy.crawlDelaySeconds);
    let res: Response;
    try {
      res = await this.rawGet(url);
    } catch (e) {
      throw new ImportBlockedError(`Could not reach ${u.host}: ${(e as Error).message}`, url, "network");
    }
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new ImportBlockedError(`${u.host} answered ${res.status} — stopping, we don't work around blocks`, url, "blocked");
    }
    if (!res.ok) throw new ImportBlockedError(`${u.host} answered ${res.status}`, url, "http");
    const html = await res.text();
    const head = html.slice(0, 20000).toLowerCase();
    if (html.length < 20000 && CHALLENGE_MARKERS.some((m) => head.includes(m)) && !head.includes("__next_data__")) {
      throw new ImportBlockedError(`${u.host} served a bot challenge — stopping`, url, "challenge");
    }
    return { url: res.url || url, html };
  }
}
