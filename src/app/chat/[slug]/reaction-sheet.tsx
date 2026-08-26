"use client";

import { useQuery } from "@tanstack/react-query";

import { Avatar } from "@/components/avatar";
import { REACTION_EMOJI, type ReactionSummary } from "@/lib/reactions";

import { fetchReactors } from "../actions";

/**
 * Who reacted, shown under the message it belongs to.
 *
 * It used to open as a panel down the right-hand side, which put the answer a
 * long way from the question — you tap a pill on one message and read about it
 * somewhere else entirely, with nothing on screen tying the two together.
 *
 * The chips along the top are also the picker: tapping one sets your reaction,
 * so changing your mind does not mean closing this and finding the hover bar.
 * Your own row says how to take it off, because a row that does something when
 * clicked should say so.
 */
export function ReactionSheet({
  messageId,
  summary,
  isMine,
  onReact,
  onClose,
  onOpenProfile,
}: {
  messageId: string;
  /** Drawn from what the bubble already knows, so the chips are there instantly. */
  summary: ReactionSummary[];
  isMine: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
}) {
  const { data: groups, isPending } = useQuery({
    queryKey: ["chat", "reactors", messageId],
    queryFn: () => fetchReactors(messageId),
    staleTime: 1000 * 20,
  });

  const total = summary.reduce((sum, r) => sum + r.count, 0);
  const mine = summary.find((r) => r.mine);

  return (
    <>
      {/* Catches the click that dismisses, without trapping the keyboard. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-30 cursor-default bg-transparent"
      />

      <div
        role="dialog"
        aria-label="Reactions"
        className={`absolute top-full z-40 mt-1.5 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
          isMine ? "right-0" : "left-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
          <span className="text-[13px] font-semibold text-ink">
            {total} {total === 1 ? "reaction" : "reactions"}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* What was picked, and the way to pick differently. */}
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-2.5">
          {REACTION_EMOJI.map((emoji) => {
            const chosen = summary.find((r) => r.emoji === emoji);
            const isOwn = mine?.emoji === emoji;

            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(messageId, emoji)}
                aria-pressed={isOwn}
                aria-label={isOwn ? `Remove ${emoji}` : `React with ${emoji}`}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[13px] leading-none transition-all active:scale-95 ${
                  isOwn
                    ? "bg-accent/15 ring-1 ring-accent/40"
                    : "ring-1 ring-line hover:bg-raised"
                }`}
              >
                <span>{emoji}</span>
                {chosen && chosen.count > 0 && (
                  <span
                    className={`text-[11px] font-semibold ${
                      isOwn ? "text-accent" : "text-muted"
                    }`}
                  >
                    {chosen.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="max-h-56 overflow-y-auto border-t border-line py-1">
          {isPending && <p className="px-3.5 py-2 text-[12px] text-muted">Loading…</p>}

          {groups?.flatMap((group) =>
            group.people.map((person) => (
              <button
                key={`${group.emoji}-${person.username}`}
                type="button"
                onClick={() =>
                  person.isYou ? onReact(messageId, group.emoji) : onOpenProfile(person.username)
                }
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-raised"
              >
                <Avatar
                  src={person.avatarUrl}
                  name={person.username}
                  size={28}
                  className="shrink-0"
                />

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium text-ink">
                    {person.isYou ? "You" : (person.displayName ?? `@${person.username}`)}
                  </span>
                  <span className="truncate text-[11px] text-muted">
                    {person.isYou ? "Tap to remove" : `@${person.username}`}
                  </span>
                </span>

                <span className="shrink-0 text-[15px] leading-none">{group.emoji}</span>
              </button>
            )),
          )}
        </div>
      </div>
    </>
  );
}
