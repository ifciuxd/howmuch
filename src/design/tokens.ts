/**
 * JS mirror of src/design/tokens.css for places CSS can't reach
 * (motion configs, OG / share images). Keep in sync — tests/unit/tokens.test.ts checks it.
 */
export const colors = {
  background: "#f4efe6",
  surface: "#ffffff",
  surfaceMuted: "#ece5d8",
  surfaceDark: "#161412",
  surfaceDarkRaised: "#24211d",
  text: "#1a1814",
  textSecondary: "#4a453d",
  textMuted: "#6a6357",
  textInverse: "#fbf8f3",
  textInverseMuted: "#a9a195",
  border: "#e1d9ca",
  borderStrong: "#c4b9a6",
  borderDark: "#3a352f",
  accent: "#ff5a1f",
  accentHover: "#ff7338",
  accentPressed: "#e84a12",
  accentSoft: "#ffe3d3",
  accentInk: "#b63a0b",
  success: "#276b43",
  successSoft: "#dcefe2",
  warning: "#8f5a0c",
  warningSoft: "#f8eacb",
  error: "#c0392b",
  errorSoft: "#f9deda",
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

export const breakpoints = { xs: 390, sm: 480, md: 768, lg: 1024, xl: 1280, "2xl": 1440, "3xl": 1920 } as const;

/** Durations in seconds (motion library) — fast 100–150ms, medium 200–300ms, slow 350–500ms. */
export const motion = {
  fast: 0.12,
  medium: 0.24,
  slow: 0.42,
  easeOut: [0.22, 1, 0.36, 1] as [number, number, number, number],
  easeInOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  spring: { type: "spring" as const, stiffness: 420, damping: 32 },
} as const;
