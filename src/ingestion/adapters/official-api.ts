import type { RawListing } from "../types";

/**
 * OfficialAPI adapter — placeholder for partner/portal APIs used under an
 * agreement (e.g. an agency CRM export endpoint). Implement `fetchListings`
 * for a concrete partner; everything downstream is already shared.
 */
export interface OfficialApiConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
}

export async function fetchFromOfficialApi(config: OfficialApiConfig): Promise<RawListing[]> {
  throw new Error(`Official API adapter "${config.name}" is not configured yet. Implement the mapping in src/ingestion/adapters/official-api.ts.`);
}
