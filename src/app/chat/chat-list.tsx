"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { avatarColour, initials } from "@/lib/avatar";
import type { RoomSummary } from "@/server/messaging/queries";

const TYPE_HINT: Record<string, string> = {
  announce: "mods only",
  ama: "quiet",
};

function shortTime(value: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return date
      .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase();
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type Filter = "all" | "unread";

export function ChatList({ rooms }: { rooms: RoomSummary[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const unreadTotal = rooms.reduce((sum, room) => sum + (room.unread > 0 ? 1 : 0), 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return rooms.filter((room) => {
      if (filter === "unread" && room.unread === 0) return false;
      if (!needle) return true;

      return (
        room.name.toLowerCase().includes(needle) ||
        (room.lastBody ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rooms, query, filter]);

  return (
    <>
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Chats</h2>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-raised px-3 py-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-faint" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or start a new chat"
            aria-label="Search chats"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <div className="flex gap-2 px-3 pb-2">
        {(["all", "unread"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-full px-3 py-1 text-[13px] transition-colors ${
              filter === option
                ? "bg-accent-soft font-medium text-accent"
                : "bg-raised text-muted hover:text-ink"
            }`}
          >
            {option === "all" ? "All" : `Unread${unreadTotal ? ` ${unreadTotal}` : ""}`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-faint">No chats found.</p>
        )}

        {visible.map((room) => {
          const active = pathname === `/chat/${room.slug}`;
          const preview = room.lastBody
            ? `${room.lastAuthor ? `${room.lastAuthor}: ` : ""}${room.lastBody}`
            : (TYPE_HINT[room.type] ?? room.topic ?? "No messages yet");

          return (
            <Link
              key={room.id}
              href={`/chat/${room.slug}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                active ? "bg-raised" : "hover:bg-raised/60"
              }`}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: avatarColour(room.slug) }}
                aria-hidden
              >
                {initials(room.name)}
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] text-ink">{room.name}</span>
                  <span
                    className={`shrink-0 text-[11px] ${
                      room.unread > 0 ? "font-semibold text-accent" : "text-faint"
                    }`}
                  >
                    {shortTime(room.lastAt)}
                  </span>
                </span>

                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] text-muted">{preview}</span>
                  {room.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
                      {room.unread > 99 ? "99+" : room.unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
