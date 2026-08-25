export default function ChatIndexLoading() {
  return (
    <>
      {/* Mobile view: list skeleton */}
      <div className="flex flex-1 flex-col bg-surface p-3 md:hidden">
        <div className="mb-3 h-8 w-24 animate-pulse rounded bg-raised" />
        <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-raised" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-raised" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-raised" />
                <div className="h-3 w-40 animate-pulse rounded bg-raised" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop view: placeholder skeleton */}
      <div className="hidden flex-1 items-center justify-center bg-chat-bg px-6 md:flex">
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-48 animate-pulse rounded bg-raised" />
          <div className="h-4 w-24 animate-pulse rounded bg-raised" />
        </div>
      </div>
    </>
  );
}
