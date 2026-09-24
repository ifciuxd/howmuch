import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "dark" | "inverse" | "ghost-inverse" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-extrabold uppercase wdth-expanded tracking-[0.04em] transition-[background-color,color,border-color,transform,box-shadow] duration-(--duration-fast) ease-out focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-45 active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-text hover:bg-accent-hover active:bg-accent-pressed",
  secondary: "border-2 border-text bg-transparent text-text hover:bg-text hover:text-text-inverse",
  tertiary: "bg-transparent text-text underline decoration-2 underline-offset-4 hover:decoration-accent normal-case tracking-normal wdth-semi-condensed",
  dark: "bg-text text-text-inverse hover:bg-surface-dark-raised",
  inverse: "bg-text-inverse text-text hover:bg-white",
  "ghost-inverse": "border-2 border-border-dark bg-transparent text-text-inverse hover:border-text-inverse",
  danger: "bg-error text-white hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 rounded-sm px-4 text-[0.75rem]",
  md: "h-12 rounded-md px-5 text-[0.8125rem]",
  lg: "h-14 rounded-md px-7 text-[0.9375rem]",
  xl: "h-16 rounded-lg px-9 text-[1.0625rem]",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string): string {
  return cn(base, variants[variant], variant !== "tertiary" && sizes[size], variant === "tertiary" && "h-auto px-0 text-body-sm", extra);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClasses(variant, size, cn(fullWidth && "w-full", className))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  icon,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; icon?: ReactNode }) {
  return (
    <Link className={buttonClasses(variant, size, cn(fullWidth && "w-full", className))} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

export function IconButton({
  label,
  className,
  children,
  tone = "light",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "light" | "dark" | "glass" }) {
  const tones = {
    light: "bg-surface text-text border border-border hover:border-border-strong",
    dark: "bg-surface-dark text-text-inverse hover:bg-surface-dark-raised",
    glass: "bg-black/45 text-white hover:bg-black/65 backdrop-blur-sm",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
