/**
 * Minimal RFC 9309 robots.txt evaluation.
 *
 * - The most specific user-agent group wins; otherwise "*".
 * - Longest matching rule wins; on a tie, Allow wins.
 * - Supports "*" wildcards and the "$" end anchor.
 */

interface Rule {
  allow: boolean;
  pattern: string;
}

interface Group {
  agents: string[];
  rules: Rule[];
  crawlDelay?: number;
}

export interface RobotsPolicy {
  isAllowed(pathWithQuery: string): boolean;
  crawlDelaySeconds?: number;
}

export function parseRobots(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      // An empty Disallow means "allow everything" — no rule needed.
      if (value === "" && key === "disallow") continue;
      current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "crawl-delay") {
      const d = Number.parseFloat(value);
      if (Number.isFinite(d)) current.crawlDelay = d;
    }
  }
  return groups;
}

function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

export function robotsPolicy(text: string, userAgentToken: string): RobotsPolicy {
  const groups = parseRobots(text);
  const token = userAgentToken.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);
  const crawlDelay = chosen.map((g) => g.crawlDelay).find((d) => d != null);
  const compiled = rules.map((r) => ({ ...r, re: patternToRegex(r.pattern), len: r.pattern.length }));
  return {
    crawlDelaySeconds: crawlDelay,
    isAllowed(pathWithQuery: string) {
      let best: { allow: boolean; len: number } | null = null;
      for (const r of compiled) {
        if (!r.re.test(pathWithQuery)) continue;
        if (!best || r.len > best.len || (r.len === best.len && r.allow)) best = { allow: r.allow, len: r.len };
      }
      return best ? best.allow : true;
    },
  };
}

export const ALLOW_ALL: RobotsPolicy = { isAllowed: () => true };
export const DISALLOW_ALL: RobotsPolicy = { isAllowed: () => false };
