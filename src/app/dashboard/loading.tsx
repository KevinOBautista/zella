export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-10 w-64 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-accent-soft)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[20px] bg-[var(--color-accent-soft)]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[20px] bg-[var(--color-accent-soft)]" />
    </div>
  );
}
