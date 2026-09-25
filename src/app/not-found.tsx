import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl text-[var(--color-accent)]">404</p>
      <h1 className="mt-4 text-xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        The page you&apos;re looking for may have moved or no longer exists.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-6")}>
        Back to homepage
      </Link>
    </main>
  );
}
