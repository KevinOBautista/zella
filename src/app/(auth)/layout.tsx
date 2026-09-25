import Link from "next/link";
import { brand } from "@/config/brand";
import { isFixtureMode, PREVIEW_READ_ONLY_MESSAGE } from "@/config/runtime";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="font-display mb-8 text-2xl text-[var(--color-foreground)]">
        {brand.name}
      </Link>
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
        {isFixtureMode ? <p className="text-sm text-[var(--color-muted)]">{PREVIEW_READ_ONLY_MESSAGE}</p> : children}
      </div>
    </div>
  );
}
