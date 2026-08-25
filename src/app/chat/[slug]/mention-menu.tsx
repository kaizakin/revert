"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Avatar } from "@/components/avatar";

import { searchRoomMembers, type MentionCandidate } from "../actions";

/**
 * The @ token the caret currently sits in, or null.
 *
 * Anchored to a word boundary so an email address never opens the menu, and it
 * only looks at text before the caret — typing in the middle of a sentence
 * should not re-trigger on an @ further along.
 */
export function activeMentionQuery(value: string, caret: number) {
  const before = value.slice(0, caret);
  const match = before.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
  if (!match) return null;

  return { query: match[1], start: caret - match[1].length - 1 };
}

type Props = {
  slug: string;
  query: string;
  onPick: (username: string) => void;
  onClose: () => void;
};

export function MentionMenu({ slug, query, onPick, onClose }: Props) {
  const [active, setActive] = useState(0);
  const trimmed = query.trim().toLowerCase();

  const { data: candidates = [] } = useQuery<MentionCandidate[]>({
    queryKey: ["chat", "mentions", slug, trimmed],
    queryFn: () => searchRoomMembers(slug, trimmed),
    staleTime: 1000 * 60 * 5,
  });

  const items = useMemo(() => {
    // @all first, and only while it still matches what has been typed.
    const all: MentionCandidate[] = "all".startsWith(trimmed)
      ? [{ username: "all", displayName: "Everyone in this group", avatarUrl: null }]
      : [];

    return [...all, ...candidates];
  }, [trimmed, candidates]);

  /**
   * Bound on the window during capture, so the arrow keys and Enter are claimed
   * before the composer's own keydown turns Enter into a send.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (items.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % items.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i - 1 + items.length) % items.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        onPick(items[active].username);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [items, active, onPick, onClose]);

  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface/95 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-faint">
        Mention Member
      </div>
      {items.map((item, index) => {
        const isActive = index === active;
        const isAll = item.username === "all";

        return (
          <button
            key={item.username}
            type="button"
            onMouseEnter={() => setActive(index)}
            onClick={() => onPick(item.username)}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              isActive ? "bg-raised" : "hover:bg-raised/60"
            }`}
          >
            <div className="relative shrink-0">
              {isAll ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-ink text-xs font-bold">
                  @
                </div>
              ) : (
                <Avatar src={item.avatarUrl} name={item.username} size={28} />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`truncate text-[13px] ${
                    isActive ? "font-bold text-ink" : "font-medium text-ink"
                  }`}
                >
                  {item.displayName ?? `@${item.username}`}
                </span>
                {isAll && (
                  <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-accent">
                    Everyone
                  </span>
                )}
              </div>
              {item.displayName && (
                <span className="truncate text-[11px] text-muted">@{item.username}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
