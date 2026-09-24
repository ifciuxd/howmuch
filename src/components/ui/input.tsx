import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="label text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          "h-12 w-full rounded-md border-2 border-border bg-surface px-4 text-body text-text placeholder:text-text-muted transition-colors duration-(--duration-fast) focus:border-text focus:outline-none",
          error && "border-error",
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-body-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-body-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
