/**
 * Image helpers for hotlinked listing photos. We never proxy or re-host them;
 * when a CDN exposes size parameters we request an appropriate size.
 */

const OLX_APOLLO = /(apollo[^/]*\.olxcdn\.com\/v1\/files\/[^/]+\/image)(;s=\d+x\d+)?(;q=\d+)?/;

export function sizedImage(url: string, width: number): string {
  const m = OLX_APOLLO.exec(url);
  if (!m) return url;
  const height = Math.round((width * 3) / 4);
  return url.replace(m[0], `${m[1]};s=${width}x${height}${m[3] ?? ""}`);
}

export function srcSetFor(url: string): string | undefined {
  if (!OLX_APOLLO.test(url)) return undefined;
  return [640, 1024, 1600].map((w) => `${sizedImage(url, w)} ${w}w`).join(", ");
}
