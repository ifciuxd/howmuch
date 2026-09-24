"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "neutral" | "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastTone) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string, tone: ToastTone = "neutral") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, message, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+16px)] z-[100] flex flex-col items-center gap-2 px-4 md:bottom-8"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "pointer-events-auto rounded-full px-5 py-3 text-body-sm font-semibold shadow-lg",
                t.tone === "error" ? "bg-error text-white" : t.tone === "success" ? "bg-success text-white" : "bg-surface-dark text-text-inverse",
              )}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
