import { cn } from "@/lib/cn";

export function Skeleton({ className, dark }: { className?: string; dark?: boolean }) {
  return <div aria-hidden className={cn(dark ? "skeleton-dark" : "skeleton", "rounded-md", className)} />;
}
