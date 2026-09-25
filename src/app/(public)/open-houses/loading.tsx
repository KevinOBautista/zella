function Bone({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[12px] bg-[var(--color-border)] ${className}`} />;
}

/** Skeleton mirroring the /open-houses layout so nothing jumps when data lands. */
export default function OpenHousesLoading() {
  return (
    <main aria-busy="true" aria-label="Loading open houses" className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="max-w-2xl space-y-3">
        <Bone className="h-11 w-56 sm:h-12" />
        <Bone className="h-5 w-full max-w-md" />
      </div>
      <div className="mt-12 space-y-3">
        <Bone className="h-8 w-40" />
        <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="space-y-3">
              <Bone className="aspect-[4/3] rounded-[20px]" />
              <Bone className="h-6 w-28" />
              <Bone className="h-4 w-40" />
              <Bone className="h-4 w-52" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
