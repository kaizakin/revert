"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Avatar } from "@/components/avatar";
import type { RoomSummary } from "@/server/messaging/queries";
import { fetchUserRooms } from "./actions";

const TYPE_HINT: Record<string, string> = {
  announce: "mods only",
  ama: "quiet",
};

function formatChatTime(value: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60_000) return "Just now";

  if (date.toDateString() === now.toDateString()) {
    return date
      .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase();
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type Filter = "all" | "unread";

export function ChatList({ rooms }: { rooms: RoomSummary[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: cachedRooms = rooms } = useQuery<RoomSummary[]>({
    queryKey: ["chat", "rooms"],
    queryFn: () => fetchUserRooms(),
    initialData: rooms,
    staleTime: 1000 * 60 * 5,
  });

  const unreadTotal = cachedRooms.reduce((sum, room) => sum + (room.unread > 0 ? 1 : 0), 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return cachedRooms.filter((room) => {
      if (filter === "unread" && room.unread === 0) return false;
      if (!needle) return true;

      return (
        room.name.toLowerCase().includes(needle) ||
        (room.lastBody ?? "").toLowerCase().includes(needle) ||
        (room.topic ?? "").toLowerCase().includes(needle)
      );
    });
  }, [cachedRooms, query, filter]);

  return (
    <div className="flex h-full flex-col bg-surface select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-ink">Chats</h2>
          {unreadTotal > 0 && (
            <span className="flex h-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
              {unreadTotal}
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-raised px-3 py-2 border border-transparent focus-within:border-accent/40 focus-within:bg-surface transition-all">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-faint" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations…"
            aria-label="Search chats"
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

      {/* Filter Chips */}
      <div className="flex gap-2 px-3 pb-2">
        {(["all", "unread"] as const).map((option) => {
          const isSelected = filter === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-all active:scale-95 ${
                isSelected
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "bg-raised/70 text-muted hover:bg-raised hover:text-ink"
              }`}
            >
              <span>{option === "all" ? "All" : "Unread"}</span>
              {option === "unread" && unreadTotal > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-accent text-white px-1"
                  }`}
                >
                  {unreadTotal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {visible.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-xs font-semibold text-faint">No conversations found</p>
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 text-xs font-semibold text-accent hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {visible.map((room) => {
          const active = pathname === `/chat/${room.slug}`;
          const isUnread = room.unread > 0;

          return (
            <Link
              key={room.id}
              href={`/chat/${room.slug}`}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 ${
                active
                  ? "bg-raised shadow-xs"
                  : "hover:bg-raised/60 active:bg-raised/80"
              }`}
            >
              {/* Active left indicator pill */}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent"
                />
              )}

              <div className="relative shrink-0">
                <Avatar
                  src={room.avatarUrl}
                  name={room.name || room.slug}
                  size={46}
                  className="ring-1 ring-line/40"
                />
                {isUnread && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-1.5">
                  <span
                    className={`truncate text-[14.5px] tracking-tight ${
                      isUnread || active ? "font-bold text-ink" : "font-semibold text-ink"
                    }`}
                  >
                    {room.name}
                  </span>
                  <span
                    className={`shrink-0 text-[11px] font-medium ${
                      isUnread ? "font-bold text-accent" : "text-faint"
                    }`}
                  >
                    {formatChatTime(room.lastAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] text-muted">
                    {room.lastBody ? (
                      <>
                        {room.lastAuthor && (
                          <span className="font-semibold text-ink/80">
                            {room.lastAuthor}:{" "}
                          </span>
                        )}
                        <span>{room.lastBody}</span>
                      </>
                    ) : (
                      <span className="italic opacity-80">
                        {TYPE_HINT[room.type] ?? room.topic ?? "No messages yet"}
                      </span>
                    )}
                  </span>

                  {isUnread && (
                    <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] font-bold text-accent-ink shadow-xs">
                      {room.unread > 99 ? "99+" : room.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
