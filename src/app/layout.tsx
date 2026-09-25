import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { brand } from "@/config/brand";
import { isFixtureMode, PREVIEW_READ_ONLY_MESSAGE } from "@/config/runtime";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: brand.name, template: `%s | ${brand.name}` },
  description: brand.description,
  // The default share image and favicon come from opengraph-image.tsx and icon.tsx.
  openGraph: { siteName: brand.name },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        {isFixtureMode && (
          <p role="note" className="border-b border-[var(--color-border)] px-4 py-2 text-center text-xs text-[var(--color-muted)]">
            Preview deployment. {PREVIEW_READ_ONLY_MESSAGE}
          </p>
        )}
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
