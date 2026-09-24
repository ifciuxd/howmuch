import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** HMAC-signed tokens for cookies (guest identity). Not encryption — just tamper-proofing. */

function mac(value: string, purpose: string): string {
  return createHmac("sha256", `${env.authSecret}:${purpose}`).update(value).digest("base64url");
}

export function sign(value: string, purpose: string): string {
  return `${value}.${mac(value, purpose)}`;
}

export function unsign(token: string | undefined | null, purpose: string): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const value = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(mac(value, purpose));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return value;
}
