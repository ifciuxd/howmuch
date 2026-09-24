import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border pb-[calc(var(--bottom-nav-height)+24px)] md:pb-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex flex-col gap-2">
          <Wordmark className="text-[2rem]" />
          <p className="font-serif text-[1.35rem] italic text-text-secondary">See it. Guess it.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-text-secondary">
          <Link href="/about" className="hover:text-text">About</Link>
          <Link href="/about#sources" className="hover:text-text">Sources &amp; takedown</Link>
          <Link href="/about#privacy" className="hover:text-text">Privacy</Link>
          <Link href="/pass" className="hover:text-text">24h pass</Link>
          <span className="text-text-muted">© {new Date().getUTCFullYear()} HOWMUCH?</span>
        </nav>
      </div>
    </footer>
  );
}
