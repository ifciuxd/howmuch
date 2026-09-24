import { normalizeListing } from "./normalize";
import type { ImportReport, NormalizedProperty, RawListing, RowIssue } from "./types";
import { dedupeKey, validateProperty } from "./validate";

/**
 * Pure part of the pipeline: normalise → validate → de-duplicate.
 * Every input row ends up in exactly one bucket (valid / invalid / duplicate) —
 * nothing is silently dropped.
 */
export interface ProcessedBatch {
  report: ImportReport;
  accepted: Array<{ row: number; key: string; property: NormalizedProperty }>;
}

export function processRecords(
  source: string,
  records: RawListing[],
  opts: { existingKeys?: ReadonlySet<string>; dryRun?: boolean; defaults?: Partial<RawListing> } = {},
): ProcessedBatch {
  const errors: RowIssue[] = [];
  const duplicateRows: RowIssue[] = [];
  const accepted: ProcessedBatch["accepted"] = [];
  const seen = new Map<string, number>();

  records.forEach((raw, i) => {
    const row = raw.row ?? i + 1;
    const merged: RawListing = { ...opts.defaults, ...stripEmpty(raw) };
    const normalized = normalizeListing(merged);
    const result = validateProperty(normalized, row);
    if (!result.ok) {
      errors.push(...result.issues);
      return;
    }
    const key = dedupeKey(result.value);
    const firstRow = seen.get(key);
    if (firstRow != null) {
      duplicateRows.push({ row, message: `duplicate of row ${firstRow} in this import` });
      return;
    }
    if (opts.existingKeys?.has(key)) {
      duplicateRows.push({ row, message: "already in the database" });
      return;
    }
    seen.set(key, row);
    accepted.push({ row, key, property: result.value });
  });

  const invalidRows = new Set(errors.map((e) => e.row));
  return {
    accepted,
    report: {
      source,
      dryRun: Boolean(opts.dryRun),
      total: records.length,
      valid: accepted.length,
      invalid: invalidRows.size,
      duplicates: duplicateRows.length,
      inserted: 0,
      updated: 0,
      errors,
      duplicateRows,
      preview: accepted.slice(0, 50).map((a) => ({ row: a.row, property: a.property })),
    },
  };
}

function stripEmpty(raw: RawListing): RawListing {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as RawListing;
}
