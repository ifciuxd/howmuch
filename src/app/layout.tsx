import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { env } from "@/lib/env";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const description = "A real-estate guessing game. Look at the home, guess the price and see how close you really are.";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: { default: "HOWMUCH? — See it. Guess it.", template: "%s · HOWMUCH?" },
  description,
  applicationName: "HOWMUCH?",
  openGraph: {
    type: "website",
    siteName: "HOWMUCH?",
    title: "HOWMUCH? — See it. Guess it.",
    description,
  },
  twitter: { card: "summary_large_image", title: "HOWMUCH? — See it. Guess it.", description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${instrument.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-md focus:bg-text focus:px-4 focus:py-3 focus:text-text-inverse">
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
