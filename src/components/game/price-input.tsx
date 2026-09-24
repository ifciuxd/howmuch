"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { currencyMeta, formatPriceCompact, groupDigits } from "@/lib/format";

const MAX_DIGITS = 10;

export interface PriceInputProps {
  id?: string;
  currency: string;
  /** Raw digits, e.g. "487000". */
  digits: string;
  onDigitsChange: (digits: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  tone?: "light" | "dark";
}

/**
 * The main game control. Big numerals, currency picked automatically, numeric
 * keyboard on mobile, live thousand separators, caret kept in place while
 * formatting, and "k" / "m" shortcuts on hardware keyboards.
 */
export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(function PriceInput(
  { id = "price-guess", currency, digits, onDigitsChange, disabled, invalid, autoFocus, tone = "light" },
  forwardedRef,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);
  const caretDigits = useRef<number | null>(null);
  const meta = currencyMeta(currency);
  const display = groupDigits(digits);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || caretDigits.current == null || document.activeElement !== el) return;
    let seen = 0;
    let pos = 0;
    while (pos < display.length && seen < caretDigits.current) {
      if (/\d/.test(display[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  }, [display]);

  const commit = (next: string, caret: number) => {
    const clean = next.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
    caretDigits.current = Math.min(caret, clean.length);
    onDigitsChange(clean);
  };

  const size = display.length > 11 ? "text-[clamp(2rem,8vw,3.25rem)]" : display.length > 8 ? "text-[clamp(2.25rem,9vw,4rem)]" : "text-price-xl";
  const symbol = (
    <span aria-hidden className={cn("shrink-0 font-bold wdth-condensed", tone === "dark" ? "text-text-inverse-muted" : "text-text-muted", "text-[0.6em]")}>
      {meta.symbol}
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex w-full items-baseline justify-center gap-3 border-b-4 pb-2 transition-colors duration-(--duration-fast)",
          tone === "dark" ? "border-border-dark focus-within:border-accent" : "border-text/15 focus-within:border-accent",
          invalid && "border-error",
          size,
          "leading-none font-extrabold tracking-[-0.03em] wdth-condensed",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {meta.position === "prefix" && symbol}
        {/* Auto-width: an invisible twin of the text sizes the input exactly. */}
        <span className="inline-grid min-w-[1ch] max-w-full">
          <span aria-hidden className="invisible col-start-1 row-start-1 pr-[0.05em] whitespace-pre tnum">
            {display || "0"}
          </span>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-label={`Your guess in ${currency}`}
            aria-invalid={invalid || undefined}
            autoFocus={autoFocus}
            disabled={disabled}
            placeholder="0"
            value={display}
            onChange={(e) => {
              const el = e.target;
              const caret = el.selectionStart ?? el.value.length;
              const digitsBefore = el.value.slice(0, caret).replace(/\D/g, "").length;
              commit(el.value, digitsBefore);
            }}
            onKeyDown={(e) => {
              const k = e.key.toLowerCase();
              if ((k === "k" || k === "m") && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                if (!digits) return;
                const next = digits + (k === "k" ? "000" : "000000");
                caretDigits.current = next.length;
                onDigitsChange(next.slice(0, MAX_DIGITS));
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              const m = /^\s*[^\d]*([\d\s.,  ]+)\s*([kKmM])?/.exec(text);
              if (!m) return;
              e.preventDefault();
              let d = m[1].replace(/[.,]\d{1,2}$/, "").replace(/\D/g, "");
              if (m[2]) d += m[2].toLowerCase() === "k" ? "000" : "000000";
              caretDigits.current = d.length;
              onDigitsChange(d.replace(/^0+/, "").slice(0, MAX_DIGITS));
            }}
            className={cn(
              "col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 text-center tnum outline-none placeholder:opacity-25 focus-visible:outline-none disabled:opacity-70",
              tone === "dark" ? "text-text-inverse placeholder:text-text-inverse" : "text-text placeholder:text-text",
            )}
          />
        </span>
        {meta.position === "suffix" && symbol}
      </div>
      <p aria-live="polite" className={cn("h-5 text-body-sm tnum", tone === "dark" ? "text-text-inverse-muted" : "text-text-muted")}>
        {digits ? <>≈ {formatPriceCompact(Number(digits), currency)}</> : <span className="hidden md:inline">Tip: type 450k or 1m</span>}
      </p>
    </div>
  );
});
