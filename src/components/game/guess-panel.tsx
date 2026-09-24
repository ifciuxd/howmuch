"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PriceInput } from "./price-input";

export type LockState = "idle" | "locking" | "locked";

export const GuessPanel = forwardRef<
  HTMLInputElement,
  {
    currency: string;
    digits: string;
    onDigitsChange: (d: string) => void;
    onSubmit: () => void;
    lock: LockState;
    error: string | null;
    className?: string;
    autoFocus?: boolean;
  }
>(function GuessPanel({ currency, digits, onDigitsChange, onSubmit, lock, error, className, autoFocus }, ref) {
  const busy = lock !== "idle";
  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <label htmlFor="price-guess" className="text-center text-heading-lg font-black uppercase wdth-condensed">
        How much?
      </label>
      <PriceInput ref={ref} currency={currency} digits={digits} onDigitsChange={onDigitsChange} disabled={busy} invalid={Boolean(error)} autoFocus={autoFocus} />
      <div className="min-h-5 text-center text-body-sm text-error" role="alert">
        {error}
      </div>
      <Button type="submit" size="xl" fullWidth loading={lock === "locking"} disabled={busy && lock !== "locking"} data-testid="guess-button">
        {lock === "locking" ? "Locking in…" : lock === "locked" ? "Locked" : "Guess"}
      </Button>
    </form>
  );
});
