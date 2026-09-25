function Bone({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[12px] bg-[var(--color-border)] ${className}`} />;
}

/** Skeleton mirroring the /sellers layout so nothing jumps when data lands. */
export default function SellersLoading() {
  return (
    <main aria-busy="true" aria-label="Loading sellers" className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="max-w-2xl space-y-3">
        <Bone className="h-11 w-64 sm:h-12" />
        <Bone className="h-5 w-full max-w-md" />
      </div>
      <Bone className="mt-8 h-16 w-full rounded-[20px]" />
      <div className="mt-3 flex gap-2">
        <Bone className="h-9 w-40 rounded-full" />
        <Bone className="h-9 w-52 rounded-full" />
      </div>
      <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
            <Bone className="h-20 w-20 rounded-full" />
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-20" />
          </li>
        ))}
      </ul>
    </main>
  );
}
