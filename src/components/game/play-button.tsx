"use client";

import { useFormStatus } from "react-dom";
import { startGameAction } from "@/app/actions/game";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

function Submit({ children, variant, size, fullWidth, className, testId }: { children: React.ReactNode; variant: ButtonVariant; size: ButtonSize; fullWidth?: boolean; className?: string; testId?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} fullWidth={fullWidth} loading={pending} className={className} data-testid={testId}>
      {children}
    </Button>
  );
}

/** Any "PLAY" CTA: a tiny form so it works before JS loads and never gets prefetched. */
export function PlayButton({
  mode = "QUICK",
  scope,
  children = "Play now",
  variant = "primary",
  size = "xl",
  fullWidth,
  className,
  testId,
}: {
  mode?: "QUICK" | "DAILY" | "CITY" | "COUNTRY";
  scope?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <form action={startGameAction} className={fullWidth ? "w-full" : undefined}>
      <input type="hidden" name="mode" value={mode} />
      {scope && <input type="hidden" name="scope" value={scope} />}
      <Submit variant={variant} size={size} fullWidth={fullWidth} className={className} testId={testId}>
        {children}
      </Submit>
    </form>
  );
}
