/**
 * Number, price and place formatting. Shared by server and client.
 * Display uses English grouping ("€487,000"); the guess input groups with
 * thin spaces ("487 000") so it reads like a big game display.
 */

interface CurrencyMeta {
  symbol: string;
  position: "prefix" | "suffix";
  /** Space between symbol and number. */
  spaced: boolean;
}

const CURRENCIES: Record<string, CurrencyMeta> = {
  EUR: { symbol: "€", position: "prefix", spaced: false },
  USD: { symbol: "$", position: "prefix", spaced: false },
  GBP: { symbol: "£", position: "prefix", spaced: false },
  PLN: { symbol: "zł", position: "suffix", spaced: true },
  AED: { symbol: "AED", position: "prefix", spaced: true },
  CHF: { symbol: "CHF", position: "prefix", spaced: true },
  SEK: { symbol: "kr", position: "suffix", spaced: true },
  NOK: { symbol: "kr", position: "suffix", spaced: true },
  DKK: { symbol: "kr", position: "suffix", spaced: true },
  CZK: { symbol: "Kč", position: "suffix", spaced: true },
  JPY: { symbol: "¥", position: "prefix", spaced: false },
  CAD: { symbol: "CA$", position: "prefix", spaced: false },
  AUD: { symbol: "A$", position: "prefix", spaced: false },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCIES);

export function isSupportedCurrency(code: string): boolean {
  return code in CURRENCIES;
}

export function currencyMeta(code: string): CurrencyMeta {
  return CURRENCIES[code] ?? { symbol: code, position: "prefix", spaced: true };
}

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return grouped.format(Math.round(value));
}

function withSymbol(amount: string, currency: string): string {
  const m = currencyMeta(currency);
  const gap = m.spaced ? " " : "";
  return m.position === "prefix" ? `${m.symbol}${gap}${amount}` : `${amount}${gap}${m.symbol}`;
}

/** "€487,000", "1,250,000 zł", "AED 3,400,000" */
export function formatPrice(value: number, currency: string): string {
  return withSymbol(formatNumber(value), currency);
}

/** "€487K", "$2.4M", "1.2M zł" */
export function formatPriceCompact(value: number, currency: string): string {
  const abs = Math.abs(value);
  let amount: string;
  if (abs >= 1_000_000) amount = `${trimZero((value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1))}M`;
  else if (abs >= 1_000) amount = `${Math.round(value / 1_000)}K`;
  else amount = String(Math.round(value));
  return withSymbol(amount, currency);
}

function trimZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** Group a digit string with thin spaces for the guess input: "487000" → "487 000". */
export function groupDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export const MAX_GUESS = 2_000_000_000;

/**
 * Parse whatever the player typed into a whole positive number.
 * Accepts separators and k/m shorthands ("450k", "1.2m"). Returns null when invalid.
 */
export function parsePriceInput(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[\s  ,'_]/g, "");
  if (!s) return null;
  const m = /^(\d+(?:\.\d+)?)([km]?)$/.exec(s);
  if (!m) return null;
  const base = Number(m[1]);
  const mult = m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1;
  const value = Math.round(base * mult);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_GUESS) return null;
  return value;
}

/** 0.0642 → "6.4%" ; 0.92416 → "92.4%" */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatArea(m2: number): string {
  return `${Number.isInteger(m2) ? m2 : m2.toFixed(1)} m²`;
}

export function pricePerM2(price: number, areaM2: number | null | undefined): number | null {
  if (!areaM2 || areaM2 <= 0) return null;
  return price / areaM2;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** ISO 3166 alpha-2 → regional indicator flag. */
export function countryFlag(code: string): string {
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** "24 SEP 2026" */
export function formatShareDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return d
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = total % 60;
  return `${m}m ${s}s`;
}
