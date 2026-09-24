import { cn } from "@/lib/cn";

/** The HOWMUCH? wordmark. Always written exactly like this. */
export function Wordmark({ className, product }: { className?: string; product?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-black uppercase wdth-condensed tracking-[-0.02em] leading-none", className)}>
      <span>
        HOWMUCH<span className="text-accent">?</span>
      </span>
      {product && <span className="label font-bold tracking-[0.12em] text-[0.55em]">{product}</span>}
    </span>
  );
}
