"use client";

import { useEffect, useState } from "react";

import { avatarColour, initials } from "@/lib/avatar";

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
  const [items, setItems] = useState<MentionCandidate[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void searchRoomMembers(slug, query).then((result) => {
      if (cancelled) return;
      setItems(result);
      setActive(0);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, query]);

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
    <div className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
      {items.map((item, index) => (
        <button
          key={item.username}
          type="button"
          onMouseEnter={() => setActive(index)}
          onClick={() => onPick(item.username)}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
            index === active ? "bg-raised" : ""
          }`}
        >
          {item.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: avatarColour(item.username) }}
              aria-hidden
            >
              {initials(item.username)}
            </span>
          )}

          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] text-ink">
              {item.displayName ?? `@${item.username}`}
            </span>
            {item.displayName && (
              <span className="truncate text-[11px] text-muted">@{item.username}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
