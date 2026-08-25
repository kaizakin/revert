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
      className="flex w-full shrink-0 flex-col border-l border-line bg-surface sm:w-80 animate-in slide-in-from-right-4 duration-150"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h2 className="text-[15px] font-bold text-ink tracking-tight">Search in Chat</h2>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 rounded-xl bg-raised px-3 py-2 border border-transparent focus-within:border-accent/40 focus-within:bg-surface transition-all">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-faint" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Search messages…"
            aria-label="Search messages"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-faint/80"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-faint hover:text-ink transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M18 6L6 18M6 6l12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {query.trim().length < 2 && (
          <p className="px-2 py-8 text-center text-xs font-medium text-faint">
            Type at least two characters to search.
          </p>
        )}

        {query.trim().length >= 2 && searched && hits.length === 0 && (
          <p className="px-2 py-8 text-center text-xs font-medium text-faint">
            No matching messages found.
          </p>
        )}

        {hits.map((hit) => (
          <button
            key={hit.id}
            type="button"
            onClick={() => {
              onJumpTo(hit.id);
            }}
            className="group flex w-full flex-col gap-1 rounded-xl p-2.5 text-left transition-all hover:bg-raised active:scale-[0.99] border border-transparent hover:border-line/40"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[12.5px] font-bold text-accent">
                @{hit.authorUsername ?? "deleted"}
              </span>
              <span className="shrink-0 text-[10.5px] font-medium text-faint">
                {when(hit.createdAt)}
              </span>
            </div>
            <span className="line-clamp-2 text-[12.5px] leading-relaxed text-ink/90">
              {highlight(hit.body, query.trim())}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
