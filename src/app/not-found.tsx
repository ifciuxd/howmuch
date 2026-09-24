import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-start justify-center gap-6 px-4 md:px-8">
      <Link href="/" aria-label="HOWMUCH? home">
        <Wordmark className="text-[2rem]" />
      </Link>
      <p className="label text-accent-ink">404</p>
      <h1 className="text-heading-xl uppercase wdth-condensed">Nothing at this address.</h1>
      <p className="font-serif text-[1.75rem] leading-tight italic text-text-secondary">Even the best brokers get lost sometimes.</p>
      <Link
        href="/"
        className="inline-flex h-14 items-center rounded-md bg-accent px-7 text-[0.9375rem] font-extrabold uppercase wdth-expanded tracking-[0.04em] text-text hover:bg-accent-hover"
      >
        Back home
      </Link>
    </main>
  );
}
