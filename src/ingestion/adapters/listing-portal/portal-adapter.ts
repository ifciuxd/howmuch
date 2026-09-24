import type { RawListing } from "../../types";
import { isSearchUrl, parseListingPage, parseSearchPage, portalFor } from "./parsers";
import { ImportBlockedError, PoliteFetcher } from "./polite-fetch";

/**
 * Listing-portal adapter.
 *
 * Takes listing or search-result URLs, fetches them politely and returns
 * RawListing records. Search pages are read directly (one request yields many
 * homes) so we hit portals as little as possible.
 *
 * Imported images are *displayed from the portal's own URLs* (hotlinked, never
 * copied or re-hosted) and every home links back to its original listing after
 * the reveal. No descriptions, seller names or phone numbers are collected.
 */

export const HOTLINK_USAGE_NOTE = "Displayed from the source listing (hotlink) with attribution and link-back; not re-hosted";

export interface PortalCollectOptions {
  urls: string[];
  /** Max homes taken from each search page. */
  perSearchLimit?: number;
  /** Also open each listing from a search page for fuller facts (more requests). */
  followListings?: boolean;
  fetcher: PoliteFetcher;
  onProgress?: (message: string) => void;
}

export interface PortalCollectResult {
  records: RawListing[];
  problems: Array<{ url: string; message: string }>;
}

export async function collectFromPortals(opts: PortalCollectOptions): Promise<PortalCollectResult> {
  const records: RawListing[] = [];
  const problems: PortalCollectResult["problems"] = [];
  const stoppedHosts = new Set<string>();
  const log = opts.onProgress ?? (() => {});

  const fetchHtml = async (url: string) => {
    const host = new URL(url).host;
    if (stoppedHosts.has(host)) throw new ImportBlockedError(`${host} was stopped earlier in this run`, url, "blocked");
    try {
      return await opts.fetcher.getText(url);
    } catch (e) {
      if (e instanceof ImportBlockedError && e.reason !== "http") stoppedHosts.add(host);
      throw e;
    }
  };

  for (const url of opts.urls) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      problems.push({ url, message: "Not a valid URL" });
      continue;
    }
    try {
      if (isSearchUrl(parsedUrl.toString())) {
        log(`search  ${url}`);
        const page = await fetchHtml(url);
        let items = parseSearchPage(page.url, page.html).slice(0, opts.perSearchLimit ?? 10);
        if (items.length === 0) problems.push({ url, message: "No listings found on this page (layout may have changed)" });
        if (opts.followListings) {
          const detailed: RawListing[] = [];
          for (const it of items) {
            if (!it.sourceUrl) continue;
            try {
              const d = await fetchHtml(it.sourceUrl);
              detailed.push({ ...it, ...(parseListingPage(d.url, d.html) ?? {}) });
            } catch (e) {
              problems.push({ url: it.sourceUrl, message: (e as Error).message });
              detailed.push(it);
            }
          }
          items = detailed;
        }
        records.push(...items);
      } else {
        log(`listing ${url}`);
        const page = await fetchHtml(url);
        const item = parseListingPage(page.url, page.html);
        if (item) records.push(item);
        else problems.push({ url, message: `Could not read listing data (${portalFor(url)} layout may have changed)` });
      }
    } catch (e) {
      problems.push({ url, message: (e as Error).message });
    }
  }

  return {
    records: records.map((r, i) => ({
      ...r,
      row: i + 1,
      rightsVerified: false,
      imageUsageRights: r.imageUsageRights ?? HOTLINK_USAGE_NOTE,
    })),
    problems,
  };
}
