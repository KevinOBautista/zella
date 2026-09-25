function Bone({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[12px] bg-[var(--color-border)] ${className}`} />;
}

/** Skeleton that mirrors the Explore layout so nothing jumps when data lands. */
export default function HomesLoading() {
  return (
    <main aria-busy="true" aria-label="Loading homes" className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="max-w-2xl space-y-3">
        <Bone className="h-11 w-72 sm:h-12" />
        <Bone className="h-5 w-full max-w-md" />
      </div>
      <Bone className="mt-8 h-16 w-full rounded-[20px]" />
      <div className="mt-3 flex gap-2">
        <Bone className="h-9 w-32 rounded-full" />
        <Bone className="h-9 w-44 rounded-full" />
      </div>
      <div className="mt-12 grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Bone className="aspect-[4/3] rounded-[24px] lg:col-span-7" />
        <Bone className="min-h-64 rounded-[24px] lg:col-span-5" />
      </div>
      <div className="mt-12 flex items-end justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-32" />
        </div>
        <Bone className="h-10 w-40 rounded-full" />
      </div>
      <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="space-y-3">
            <Bone className="aspect-[4/3] rounded-[20px]" />
            <Bone className="h-6 w-28" />
            <Bone className="h-4 w-40" />
            <Bone className="h-4 w-52" />
          </li>
        ))}
      </ul>
    </main>
  );
}
