/** The Explore-style top-level page heading, shared by /homes, /open-houses, and /sellers. */
export function ExplorePageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="max-w-2xl">
      <h1 className="text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-3 text-base text-[var(--color-muted)]">{subtitle}</p>}
    </header>
  );
}
