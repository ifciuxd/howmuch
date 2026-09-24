import { hashString } from "@/game/rng";
import { cn } from "@/lib/cn";

const TONES = ["#ff5a1f", "#1a1814", "#276b43", "#8f5a0c", "#4a453d", "#b63a0b"];

export function UserAvatar({ name, image, size = 36, className }: { name: string; image?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} referrerPolicy="no-referrer" />
    );
  }
  const bg = TONES[hashString(name) % TONES.length];
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-extrabold wdth-condensed", bg === "#ff5a1f" ? "text-text" : "text-text-inverse", className)}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
    >
      {initials || "?"}
    </span>
  );
}
