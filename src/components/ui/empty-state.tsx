import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  body,
  action,
  className,
  tone = "light",
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border-2 border-dashed px-6 py-10 md:px-10",
        tone === "dark" ? "border-border-dark text-text-inverse" : "border-border-strong text-text",
        className,
      )}
    >
      <p className="text-heading-md">{title}</p>
      {body && <div className={cn("max-w-md text-body", tone === "dark" ? "text-text-inverse-muted" : "text-text-secondary")}>{body}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
