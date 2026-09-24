"use client";

import { CalendarDays, Play, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const DESKTOP = [
  { href: "/daily", label: "Daily" },
  { href: "/cities", label: "Cities" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      <Link
        href="/play"
        className={cn(
          "mr-2 inline-flex h-10 items-center rounded-full bg-accent px-5 text-[0.8125rem] font-extrabold uppercase wdth-expanded tracking-[0.05em] text-text transition-colors hover:bg-accent-hover",
        )}
      >
        Play
      </Link>
      {DESKTOP.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(pathname, l.href) ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-2 text-[0.8125rem] font-bold uppercase wdth-expanded tracking-[0.05em] transition-colors",
            isActive(pathname, l.href) ? "bg-text text-text-inverse" : "text-text-secondary hover:bg-surface-muted hover:text-text",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const MOBILE = [
  { href: "/play", label: "Play", icon: Play, primary: true },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-[var(--bottom-nav-height)] max-w-md grid-cols-4 items-center px-2">
        {MOBILE.map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-16 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[0.6875rem] font-bold uppercase wdth-expanded tracking-[0.06em] transition-colors",
                  active ? "text-text" : "text-text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    primary ? "bg-accent text-text" : active ? "bg-text text-text-inverse" : "",
                  )}
                >
                  <Icon className={cn("size-5", primary && "fill-current")} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
