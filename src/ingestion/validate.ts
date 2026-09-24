import { z } from "zod";
import { MAX_GUESS, isSupportedCurrency } from "@/lib/format";
import type { NormalizedProperty, RowIssue } from "./types";

/**
 * Data-quality gate. A property only reaches games if it passes all of this.
 */

/** Plausible price-per-m² bands. Outside ⇒ probably a rental, a typo or a parking spot. */
const PRICE_PER_M2_BANDS: Record<string, [number, number]> = {
  PLN: [2_000, 80_000],
  EUR: [500, 60_000],
  GBP: [500, 80_000],
  USD: [500, 150_000],
  AED: [3_000, 250_000],
  CHF: [2_000, 100_000],
  CZK: [20_000, 800_000],
};

const imageUrl = z
  .string()
  .refine((s) => /^https?:\/\/[^\s]+$/i.test(s) || /^\/[^\s]*$/.test(s), "must be an http(s) URL");

const currentYear = new Date().getUTCFullYear();

export const propertySchema = z.object({
  title: z.string().min(1, "is required").max(200),
  country: z.string().min(2, "is required").max(80),
  countryCode: z.string().regex(/^[A-Z]{2}$/, "must be a 2-letter ISO code (e.g. PL)"),
  city: z.string().min(1, "is required").max(80),
  citySlug: z.string().min(1, "could not be derived from city"),
  region: z.string().max(80).nullable(),
  neighborhood: z.string().max(120).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  price: z.number().int().min(1_000, "must be a positive price").max(MAX_GUESS, "is unrealistically high"),
  currency: z.string().refine(isSupportedCurrency, "is not a supported currency (e.g. PLN, EUR, GBP, USD)"),
  areaM2: z.number().min(8, "is too small").max(5_000, "is too large").nullable(),
  rooms: z.number().int().min(1).max(50).nullable(),
  bathrooms: z.number().int().min(0).max(20).nullable(),
  propertyType: z.enum(["APARTMENT", "STUDIO", "PENTHOUSE", "LOFT", "HOUSE", "TOWNHOUSE", "VILLA"], {
    error: "is not a home type (apartment, studio, penthouse, loft, house, townhouse, villa)",
  }),
  floor: z.number().int().min(-2).max(200).nullable(),
  yearBuilt: z.number().int().min(1200).max(currentYear + 5).nullable(),
  description: z.string().max(5_000).nullable(),
  imageUrls: z.array(imageUrl).min(1, "needs at least one image").max(40),
  sourceName: z.string().min(1).max(80),
  sourceUrl: z.string().url().nullable(),
  sourceListingId: z.string().max(120).nullable(),
  difficulty: z.number().int().min(1).max(10),
  rightsVerified: z.boolean(),
  imageUsageRights: z.string().max(300).nullable(),
  offerType: z.enum(["sale", "rent"]).nullable(),
});

export type ValidationResult = { ok: true; value: NormalizedProperty } | { ok: false; issues: RowIssue[] };

export function validateProperty(p: NormalizedProperty, row: number): ValidationResult {
  const issues: RowIssue[] = [];
  const parsed = propertySchema.safeParse(p);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || undefined;
      issues.push({ row, field, message: field ? `${field} ${issue.message}` : issue.message });
    }
  }
  if (p.offerType === "rent") issues.push({ row, field: "offerType", message: "is a rental — only homes for sale can be played" });
  if (p.areaM2 && p.price > 0 && PRICE_PER_M2_BANDS[p.currency]) {
    const [min, max] = PRICE_PER_M2_BANDS[p.currency];
    const perM2 = p.price / p.areaM2;
    if (perM2 < min || perM2 > max) {
      issues.push({
        row,
        field: "price",
        message: `price per m² (${Math.round(perM2)} ${p.currency}) is implausible — is this a rental or a typo?`,
      });
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, value: p };
}

/** Stable identity used to detect duplicates within an import and against the database. */
export function dedupeKey(p: Pick<NormalizedProperty, "sourceName" | "sourceListingId" | "sourceUrl" | "citySlug" | "price" | "areaM2" | "rooms" | "imageUrls">): string {
  if (p.sourceListingId) return `id:${p.sourceName.toLowerCase()}:${p.sourceListingId}`;
  if (p.sourceUrl) return `url:${p.sourceUrl.replace(/[?#].*$/, "").toLowerCase()}`;
  return `fp:${p.citySlug}:${p.price}:${p.areaM2 ?? ""}:${p.rooms ?? ""}:${p.imageUrls[0] ?? ""}`;
}
