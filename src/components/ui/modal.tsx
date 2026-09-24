"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

/**
 * Native <dialog> modal: focus trapping, Esc to close and inert background come for free.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  variant = "sheet",
  hideTitle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  variant?: "sheet" | "fullscreen";
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current && variant === "sheet") onClose();
      }}
      className={cn(
        "backdrop:bg-black/60 backdrop:backdrop-blur-[2px] m-auto max-h-[100dvh] max-w-[100vw] overflow-visible bg-transparent p-0 text-text",
        variant === "fullscreen" ? "h-[100dvh] w-[100vw]" : "w-[min(560px,calc(100vw-32px))]",
        className,
      )}
    >
      {open &&
        (variant === "fullscreen" ? (
          <div className="relative h-full w-full bg-surface-dark text-text-inverse">
            <div className="absolute top-3 right-3 z-20">
              <IconButton label="Close" tone="glass" onClick={onClose}>
                <X className="size-5" />
              </IconButton>
            </div>
            {children}
          </div>
        ) : (
          <div className="rounded-xl bg-surface p-6 shadow-lg md:p-8">
            <div className={cn("mb-4 flex items-start justify-between gap-4", hideTitle && "sr-only")}>
              <h2 className="text-heading-md">{title}</h2>
              <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
                <X className="size-5" />
              </IconButton>
            </div>
            {children}
          </div>
        ))}
    </dialog>
  );
}
