export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      {/* Header skeleton */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded bg-raised" />
          <div className="h-4 w-48 animate-pulse rounded bg-raised" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 animate-pulse rounded-lg bg-raised" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-raised" />
        </div>
      </header>

      {/* Picture section skeleton */}
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="h-3 w-16 animate-pulse rounded bg-raised" />
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-raised" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-raised" />
              ))}
            </div>
          </div>
        </section>

        {/* About section skeleton */}
        <section className="flex flex-col gap-4 border-t border-line pt-8">
          <div className="h-3 w-20 animate-pulse rounded bg-raised" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="h-4 w-20 animate-pulse rounded bg-raised" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-raised" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-24 animate-pulse rounded bg-raised" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-raised" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-16 animate-pulse rounded bg-raised" />
              <div className="h-24 w-full animate-pulse rounded-lg bg-raised" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
