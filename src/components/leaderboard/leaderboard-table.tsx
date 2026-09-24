import { UserAvatar } from "@/components/ui/user-avatar";
import type { BoardRow } from "@/services/leaderboard-service";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercent } from "@/lib/format";

export function LeaderboardTable({ rows, meId, compact, tone = "light", caption }: { rows: BoardRow[]; meId?: string | null; compact?: boolean; tone?: "light" | "dark"; caption: string }) {
  const dark = tone === "dark";
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className={cn(compact && "sr-only")}>
        <tr className={cn("label", dark ? "text-text-inverse-muted" : "text-text-muted")}>
          <th scope="col" className="w-12 pb-3 font-semibold">#</th>
          <th scope="col" className="pb-3 font-semibold">Player</th>
          <th scope="col" className="pb-3 text-right font-semibold">Score</th>
          <th scope="col" className="hidden pb-3 text-right font-semibold sm:table-cell">Accuracy</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const me = r.userId === meId;
          return (
            <tr
              key={r.userId}
              className={cn(
                "border-t",
                dark ? "border-border-dark" : "border-border",
                me && (dark ? "bg-surface-dark-raised" : "bg-accent-soft"),
              )}
            >
              <td className={cn("py-3 pl-1 font-black wdth-condensed tnum", compact ? "text-heading-md" : "text-heading-md", r.rank <= 3 && "text-accent-ink", dark && r.rank <= 3 && "text-accent")}>{r.rank}</td>
              <td className="py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={r.username} image={r.image} size={compact ? 28 : 34} />
                  <span className="truncate font-semibold">
                    {r.username}
                    {me && <span className={cn("label ml-2", dark ? "text-accent" : "text-accent-ink")}>You</span>}
                  </span>
                </span>
              </td>
              <td className="py-3 text-right text-heading-md font-extrabold wdth-condensed tnum">{formatNumber(r.score)}</td>
              <td className={cn("hidden py-3 pr-1 text-right tnum sm:table-cell", dark ? "text-text-inverse-muted" : "text-text-secondary")}>{formatPercent(r.accuracy)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
