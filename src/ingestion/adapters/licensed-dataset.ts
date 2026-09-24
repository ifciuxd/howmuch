import { parseListingsCsv } from "./manual-csv";
import { parseListingsJson } from "./manual-json";
import type { RawListing } from "../types";

/**
 * LicensedDataset adapter — bulk files delivered by a data partner.
 * Accepts the CSV/JSON formats and stamps licence metadata on every row.
 */
export function readLicensedDataset(text: string, format: "csv" | "json", licence: { sourceName: string; terms: string }): RawListing[] {
  const records = format === "csv" ? parseListingsCsv(text).records : parseListingsJson(text).records;
  return records.map((r) => ({ ...r, sourceName: r.sourceName ?? licence.sourceName, imageUsageRights: r.imageUsageRights ?? licence.terms, rightsVerified: r.rightsVerified ?? true }));
}
