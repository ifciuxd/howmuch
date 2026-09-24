import { colors } from "@/design/tokens";
import type { Tier } from "@/game/scoring";
import { formatNumber, formatPercent } from "@/lib/format";

/**
 * Share card artwork for next/og (satori). Inline styles only.
 * House glyphs replace emoji so the image renders identically everywhere.
 */

/** Solid orange = great, solid white = good, grey = off, outline = way off. */
function House({ tier, size }: { tier: Tier; size: number }) {
  const great = tier === "BULLSEYE" || tier === "EXCELLENT" || tier === "GREAT";
  const fill = great ? colors.accent : tier === "GOOD" ? colors.textInverse : tier === "OFF" ? colors.textInverseMuted : "none";
  const stroke = fill === "none" ? colors.textInverseMuted : fill;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path d="M24 4 L44 20 V44 H4 V20 Z" fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
      <rect x="19" y="29" width="10" height="15" fill={fill === "none" ? "none" : colors.surfaceDark} />
      {tier === "BULLSEYE" && <circle cx="24" cy="22" r="4" fill={colors.surfaceDark} />}
    </svg>
  );
}

export interface ShareCardData {
  headline: string;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  tiers: Tier[];
  username?: string | null;
  host: string;
}

export function ShareCard({ data, format }: { data: ShareCardData; format: "og" | "portrait" }) {
  const og = format === "og";
  const pad = og ? 64 : 88;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: colors.surfaceDark,
        color: colors.textInverse,
        padding: pad,
        fontFamily: "Archivo",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", fontFamily: "Archivo Condensed", fontSize: og ? 56 : 84, letterSpacing: -1 }}>
          HOWMUCH<span style={{ color: colors.accent }}>?</span>
        </div>
        <div style={{ display: "flex", fontFamily: "Archivo Expanded", fontSize: og ? 20 : 28, letterSpacing: 3, color: colors.accent }}>{data.headline}</div>
      </div>

      <div style={{ display: "flex", flexDirection: og ? "row" : "column", alignItems: og ? "flex-end" : "flex-start", justifyContent: "space-between", gap: og ? 40 : 56 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: "Archivo Condensed", lineHeight: 0.85 }}>
            <span style={{ fontSize: og ? 200 : 270, color: colors.textInverse }}>{formatNumber(data.totalScore)}</span>
            <span style={{ fontSize: og ? 64 : 84, color: colors.textInverseMuted, marginLeft: 16 }}>/ {formatNumber(data.maxScore)}</span>
          </div>
          <div style={{ display: "flex", marginTop: og ? 20 : 40, fontSize: og ? 34 : 46, color: colors.textInverseMuted }}>
            {formatPercent(data.accuracy)} accuracy{data.username ? ` · ${data.username}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: og ? 18 : 26, marginBottom: og ? 16 : 0 }}>
          {data.tiers.map((t, i) => (
            <House key={i} tier={t} size={og ? 64 : 110} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `2px solid ${colors.borderDark}`, paddingTop: og ? 24 : 36 }}>
        <div style={{ display: "flex", fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: og ? 48 : 66 }}>See it. Guess it.</div>
        <div style={{ display: "flex", fontFamily: "Archivo Expanded", fontSize: og ? 22 : 30, letterSpacing: 2, color: colors.textInverseMuted }}>{data.host}</div>
      </div>
    </div>
  );
}
