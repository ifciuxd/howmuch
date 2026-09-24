import Papa from "papaparse";
import type { RawListing } from "../types";

/**
 * ManualCSV adapter. Expected header (order free, extra columns ignored):
 * title,country,countryCode,city,region,neighborhood,price,currency,areaM2,rooms,
 * bathrooms,propertyType,floor,yearBuilt,imageUrls,sourceName,sourceUrl,
 * sourceListingId,difficulty,rightsVerified,imageUsageRights
 *
 * imageUrls: separate several URLs with "|" (or ";").
 */

export const CSV_COLUMNS = [
  "title", "country", "countryCode", "city", "region", "neighborhood", "price", "currency", "areaM2", "rooms",
  "bathrooms", "propertyType", "floor", "yearBuilt", "imageUrls", "sourceName", "sourceUrl", "sourceListingId",
  "difficulty", "rightsVerified", "imageUsageRights",
] as const;

const REQUIRED = ["country", "city", "price", "currency", "imageUrls"] as const;

export interface CsvParseResult {
  records: RawListing[];
  headerErrors: string[];
}

export function parseListingsCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const fields = parsed.meta.fields ?? [];
  const lower = new Map(fields.map((f) => [f.toLowerCase(), f]));
  const headerErrors = REQUIRED.filter((r) => !lower.has(r.toLowerCase())).map((r) => `Missing required column "${r}"`);
  const records: RawListing[] = parsed.data.map((row, i) => {
    const pickCol = (name: string) => {
      const key = lower.get(name.toLowerCase());
      return key ? row[key]?.trim() : undefined;
    };
    const rec: RawListing = { row: i + 2 };
    for (const col of CSV_COLUMNS) {
      const v = pickCol(col);
      if (v !== undefined && v !== "") (rec as Record<string, unknown>)[col] = v;
    }
    return rec;
  });
  return { records, headerErrors };
}

export function csvTemplate(): string {
  const example = [
    "Bright 3-room flat near the park", "Poland", "PL", "Gdańsk", "Pomorskie", "Wrzeszcz", "789000", "PLN", "58.4", "3",
    "1", "APARTMENT", "2", "2012", "https://example.com/1.jpg|https://example.com/2.jpg", "Partner Agency", "https://example.com/listing/1", "A-1001",
    "4", "true", "Licensed from Partner Agency (agreement 2026-01)",
  ];
  return `${CSV_COLUMNS.join(",")}\n${example.map((v) => (v.includes(",") ? `"${v}"` : v)).join(",")}\n`;
}
