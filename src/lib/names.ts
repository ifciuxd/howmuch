import { createRng, pick } from "@/game/rng";

const ADJECTIVES = [
  "Quiet", "Sharp", "Lucky", "Bold", "Clever", "Swift", "Calm", "Keen", "Brave", "Sunny", "Witty", "Nimble",
  "Steady", "Curious", "Daring", "Mellow", "Savvy", "Lively", "Frank", "Gentle", "Rapid", "Plucky", "Canny", "Zesty",
];
const ANIMALS = [
  "Heron", "Otter", "Fox", "Lynx", "Magpie", "Badger", "Falcon", "Hare", "Owl", "Seal", "Stork", "Marten",
  "Wren", "Bison", "Gecko", "Panda", "Raven", "Koala", "Puffin", "Moose", "Crane", "Beaver", "Dolphin", "Ibex",
];

/** "Quiet Heron 482" — friendly, anonymous, unique-ish (callers retry on collision). */
export function guestName(seed: string): string {
  const rng = createRng(seed);
  return `${pick(rng, ADJECTIVES)} ${pick(rng, ANIMALS)} ${100 + Math.floor(rng() * 900)}`;
}

export const USERNAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,22}[\p{L}\p{N}]$/u;

export function isValidUsername(name: string): boolean {
  return USERNAME_RE.test(name.trim());
}
