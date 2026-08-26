"use client";

import { useQuery } from "@tanstack/react-query";

import { Avatar } from "@/components/avatar";

import { fetchReactors } from "../actions";

/**
 * Who reacted to one message, grouped by what they picked.
 *
 * Opened by tapping the reaction pill on a bubble. The names are fetched when
 * this opens rather than carried on every message: a room only ever needs them
 * for the one message somebody tapped, and putting them in the page payload
 * would cost far more than the bubble draws.
 *
 * A tab per emoji would be the fuller version of this. With one reaction per
 * person the whole list is short, and showing every group at once means nobody
 * has to hunt through tabs to find themselves.
 */
export function ReactorsPanel({
  messageId,
  onClose,
  onOpenMember,
}: {
  messageId: string;
  onClose: () => void;
  onOpenMember: (username: string) => void;
}) {
  const { data: groups, isPending } = useQuery({
    queryKey: ["chat", "reactors", messageId],
    queryFn: () => fetchReactors(messageId),
    staleTime: 1000 * 30,
  });

  const total = groups?.reduce((sum, group) => sum + group.people.length, 0) ?? 0;

  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-line bg-surface md:w-72 lg:w-80">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold text-ink">Reactions</span>
          {total > 0 && (
            <span className="text-[12px] text-muted">
              {total} {total === 1 ? "person" : "people"}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isPending && <p className="px-2 py-4 text-[13px] text-muted">Loading…</p>}

        {!isPending && total === 0 && (
          <p className="px-2 py-4 text-[13px] text-muted">Nobody has reacted to this yet.</p>
        )}

        {groups?.map((group) => (
          <section key={group.emoji} className="mb-3">
            <div className="flex items-center gap-2 px-2 pb-1.5">
              <span className="text-[15px] leading-none">{group.emoji}</span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
                {group.people.length}
              </span>
            </div>

            {group.people.map((person) => (
              <button
                key={`${group.emoji}-${person.username}`}
                type="button"
                onClick={() => onOpenMember(person.username)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-raised"
              >
                <Avatar
                  src={person.avatarUrl}
                  name={person.username}
                  size={30}
                  className="shrink-0"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium text-ink">
                    {person.displayName ?? `@${person.username}`}
                  </span>
                  {person.displayName && (
                    <span className="truncate text-[11px] text-muted">@{person.username}</span>
                  )}
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
