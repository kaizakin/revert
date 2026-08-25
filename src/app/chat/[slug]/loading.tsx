export default function ChatRoomLoading() {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-raised" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded bg-raised" />
            <div className="h-3 w-20 animate-pulse rounded bg-raised" />
          </div>
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-raised" />
        </div>

        {/* Message area skeleton */}
        <div className="chat-pattern flex flex-1 flex-col justify-end gap-3 p-4">
          <div className="flex justify-start">
            <div className="w-56 space-y-2 rounded-2xl rounded-tl-sm border border-line bg-bubble-in p-3 shadow-xs">
              <div className="h-3 w-16 animate-pulse rounded bg-raised" />
              <div className="h-3.5 w-44 animate-pulse rounded bg-raised" />
              <div className="h-3 w-24 animate-pulse rounded bg-raised" />
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 rounded-2xl rounded-tr-sm bg-bubble-out p-3 shadow-xs">
              <div className="h-3.5 w-52 animate-pulse rounded bg-raised/70" />
              <div className="h-3.5 w-36 animate-pulse rounded bg-raised/70" />
            </div>
          </div>

          <div className="flex justify-start">
            <div className="w-72 space-y-2 rounded-2xl rounded-tl-sm border border-line bg-bubble-in p-3 shadow-xs">
              <div className="h-3 w-20 animate-pulse rounded bg-raised" />
              <div className="h-3.5 w-60 animate-pulse rounded bg-raised" />
              <div className="h-3.5 w-40 animate-pulse rounded bg-raised" />
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-48 space-y-2 rounded-2xl rounded-tr-sm bg-bubble-out p-3 shadow-xs">
              <div className="h-3.5 w-36 animate-pulse rounded bg-raised/70" />
            </div>
          </div>
        </div>

        {/* Footer input skeleton */}
        <div className="border-t border-line bg-surface p-3">
          <div className="flex items-center gap-2">
            <div className="h-10 flex-1 animate-pulse rounded-lg bg-raised" />
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-raised" />
          </div>
        </div>
      </div>
    </div>
  );
}
