// Test-only image server. Serves plain placeholder images for fixture homes so
// E2E tests and local UI work run without any network access.
// Never used in production content.
import http from "node:http";

const port = Number(process.env.FIXTURE_IMAGE_PORT ?? 4555);
const palette = ["#8a9a8c", "#b59c82", "#7d8ea3", "#a58b8b", "#9c9a7c", "#8f7f9a", "#7f9a98", "#a3957b"];

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

http
  .createServer((req, res) => {
    const m = /^\/img\/([\w-]+)\/(\d+)\.svg$/.exec(req.url ?? "");
    if (!m) {
      res.writeHead(404).end();
      return;
    }
    const [, id, n] = m;
    const a = palette[hash(id) % palette.length];
    const b = palette[(hash(id) + Number(n) + 3) % palette.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200" width="1600" height="1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1600" height="1200" fill="url(#g)"/><rect x="0" y="820" width="1600" height="380" fill="#000" opacity="0.12"/><text x="80" y="1110" font-family="sans-serif" font-size="56" font-weight="700" fill="#fff" opacity="0.85">TEST FIXTURE · ${id} · ${n}</text></svg>`;
    res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" });
    res.end(svg);
  })
  .listen(port, () => console.log(`fixture images on http://localhost:${port}`));
