"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { searchInRoom } from "../actions";
import type { SearchHit } from "@/server/messaging/queries";

const when = (value: Date | string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

/** Wrap the matched run so the reason a result matched is visible. */
function highlight(body: string | null, needle: string) {
  if (!body) return null;

  const index = body.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return body;

  return (
    <>
      {body.slice(0, index)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent">
        {body.slice(index, index + needle.length)}
      </mark>
      {body.slice(index + needle.length)}
    </>
  );
}

export function SearchPanel({
  slug,
  onClose,
  onJumpTo,
}: {
  slug: string;
  onClose: () => void;
  onJumpTo: (messageId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const { data: hits = [], isFetched } = useQuery<SearchHit[]>({
    queryKey: ["chat", "search", slug, trimmed],
    queryFn: () => searchInRoom(slug, trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 60,
  });

  const searched = trimmed.length >= 2 && isFetched;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      aria-label="Search messages"
      className="flex w-full shrink-0 flex-col border-l border-line bg-surface sm:w-80"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2 className="text-[15px] font-semibold text-ink">Search</h2>
      </div>

      <div className="p-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder="Search messages"
          aria-label="Search messages"
          className="w-full rounded-lg bg-raised px-3 py-2 text-[13px] text-ink outline-none placeholder:text-faint"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {query.trim().length < 2 && (
          <p className="px-2 py-6 text-center text-[12px] text-faint">
            Type at least two characters.
          </p>
        )}

        {query.trim().length >= 2 && searched && hits.length === 0 && (
          <p className="px-2 py-6 text-center text-[12px] text-faint">No messages found.</p>
        )}

        {hits.map((hit) => (
          <button
            key={hit.id}
            type="button"
            onClick={() => onJumpTo(hit.id)}
            className="mb-1 flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-raised"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[12px] font-medium text-ink">
                @{hit.authorUsername ?? "deleted"}
              </span>
              <span className="shrink-0 text-[11px] text-faint">{when(hit.createdAt)}</span>
            </span>
            <span className="line-clamp-2 text-[12.5px] text-muted">
              {highlight(hit.body, query.trim())}
            </span>
          </button>
        ))}


      </div>
    </aside>
  );
}
