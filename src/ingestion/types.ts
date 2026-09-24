import type { PropertyTypeKey } from "@/game/products/homes";

/**
 * source → adapter → normalization → validation → database
 *
 * Adapters only turn their source into RawListing records. Everything after that
 * (normalising, validating, de-duplicating, persisting, reporting) is shared.
 */

export type SourceKindKey = "LISTING_PORTAL" | "MANUAL_CSV" | "MANUAL_JSON" | "OFFICIAL_API" | "LICENSED_DATASET" | "DEMO";

/** Loose record straight from a source. Everything optional, strings allowed. */
export interface RawListing {
  /** Row/line number in the source file, for error messages. */
  row?: number;
  title?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  neighborhood?: string;
  latitude?: number | string;
  longitude?: number | string;
  price?: number | string;
  currency?: string;
  areaM2?: number | string;
  rooms?: number | string;
  bathrooms?: number | string;
  propertyType?: string;
  floor?: number | string;
  yearBuilt?: number | string;
  description?: string;
  imageUrls?: string[] | string;
  sourceName?: string;
  sourceUrl?: string;
  sourceListingId?: string;
  difficulty?: number | string;
  rightsVerified?: boolean | string;
  imageUsageRights?: string;
  /** "sale" | "rent" — rentals are rejected (the game is about sale prices). */
  offerType?: string;
}

export interface NormalizedProperty {
  title: string;
  country: string;
  countryCode: string;
  city: string;
  citySlug: string;
  region: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number;
  currency: string;
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  propertyType: PropertyTypeKey;
  floor: number | null;
  yearBuilt: number | null;
  description: string | null;
  imageUrls: string[];
  sourceName: string;
  sourceUrl: string | null;
  sourceListingId: string | null;
  difficulty: number;
  rightsVerified: boolean;
  imageUsageRights: string | null;
  offerType: "sale" | "rent" | null;
}

export interface RowIssue {
  row: number;
  field?: string;
  message: string;
}

export interface ImportReport {
  source: string;
  dryRun: boolean;
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  inserted: number;
  updated: number;
  errors: RowIssue[];
  duplicateRows: RowIssue[];
  /** Normalised previews of valid rows (for the admin preview table). */
  preview: Array<{ row: number; property: NormalizedProperty }>;
}
