import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Wordmark } from "@/components/ui/wordmark";
import { displayStreak } from "@/services/daily-service";
import { getCurrentUser } from "@/services/user-service";
import { DesktopNav } from "./nav-links";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const streak = user ? displayStreak(user.lastDailyDate, user.currentStreak) : 0;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--nav-height)] max-w-[1440px] items-center justify-between gap-6 px-4 md:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="HOWMUCH? home">
            <Wordmark className="text-[1.75rem]" />
          </Link>
          <DesktopNav />
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Link href="/daily" className="inline-flex h-9 items-center gap-1 rounded-full bg-surface px-3 text-body-sm font-extrabold tnum" aria-label={`Daily streak ${streak}`}>
              <span aria-hidden>🔥</span> {streak}
            </Link>
          )}
          <Link
            href="/stats"
            className="hidden h-10 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-bold uppercase wdth-expanded tracking-[0.05em] text-text-secondary transition-colors hover:bg-surface-muted hover:text-text md:inline-flex"
          >
            <BarChart3 className="size-4" aria-hidden /> Stats
          </Link>
          <Link href="/profile" className="hidden items-center gap-2 rounded-full py-1 pr-1 pl-3 transition-colors hover:bg-surface-muted md:inline-flex" aria-label="Profile">
            <span className="max-w-36 truncate text-body-sm font-semibold">{user && !user.isGuest ? user.username : "Profile"}</span>
            <UserAvatar name={user?.username ?? "?"} image={user?.image} size={32} />
          </Link>
        </div>
      </div>
    </header>
  );
}
