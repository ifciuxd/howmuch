import { readFile } from "node:fs/promises";
import path from "node:path";

/** Static font instances for server-rendered images (next/og can't use variable fonts). */
const dir = path.join(process.cwd(), "src/assets/fonts");

let cache: Promise<Array<{ name: string; data: ArrayBuffer; weight: 400 | 700 | 900; style: "normal" | "italic" }>> | null = null;

async function load(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(path.join(dir, file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export function ogFonts() {
  cache ??= Promise.all([
    load("archivo-condensed-black.woff").then((data) => ({ name: "Archivo Condensed", data, weight: 900 as const, style: "normal" as const })),
    load("archivo-bold.woff").then((data) => ({ name: "Archivo", data, weight: 700 as const, style: "normal" as const })),
    load("archivo-expanded-bold.woff").then((data) => ({ name: "Archivo Expanded", data, weight: 700 as const, style: "normal" as const })),
    load("instrument-serif-italic.woff").then((data) => ({ name: "Instrument Serif", data, weight: 400 as const, style: "italic" as const })),
  ]);
  return cache;
}
