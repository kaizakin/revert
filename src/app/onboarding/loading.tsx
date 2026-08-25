export default function OnboardingLoading() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <div className="h-4 w-14 animate-pulse rounded bg-raised" />
          <div className="h-7 w-28 animate-pulse rounded bg-raised" />
          <div className="h-4 w-72 animate-pulse rounded bg-raised" />
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-raised" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-raised" />
          </div>

          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded bg-raised" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 w-12 animate-pulse rounded-full bg-raised" />
              ))}
            </div>
          </div>

          <div className="h-11 w-full animate-pulse rounded-lg bg-raised" />
        </div>
      </div>
    </main>
  );
}
