"use client";

import { useState } from "react";

import { avatarColour, initials } from "@/lib/avatar";
import type { MessageRow } from "@/server/messaging/queries";
import { REACTION_EMOJI } from "@/lib/reactions";

type Props = {
  message: MessageRow;
  isMine: boolean;
  isPending: boolean;
  startsRun: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onOpenProfile: (username: string) => void;
  onReply: (message: MessageRow) => void;
  onJumpTo: (messageId: string) => void;
};

/** Stable per-username colour for sender names, the way group chats do it. */
const NAME_COLOURS = [
  "#e542a3",
  "#5b8def",
  "#1fa855",
  "#e6a11f",
  "#9b5de5",
  "#00a3a3",
  "#e8624a",
  "#7d8bd4",
];

function nameColour(username: string | null) {
  if (!username) return "var(--rv-bubble-meta)";
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) | 0;
  return NAME_COLOURS[Math.abs(hash) % NAME_COLOURS.length];
}

const timeOf = (value: Date | string) =>
  new Date(value)
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();

function Avatar({ username, url }: { username: string | null; url: string | null }) {
  if (url) {
    // Clerk avatars, already on a CDN; a plain img avoids configuring remote
    // image patterns for a 28px circle.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: avatarColour(username) }}
      aria-hidden
    >
      {initials(username)}
    </span>
  );
}

export function MessageBubble({
  message,
  isMine,
  isPending,
  startsRun,
  onReact,
  onOpenProfile,
  onReply,
  onJumpTo,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const tail = startsRun ? (isMine ? "tail-out" : "tail-in") : "";

  return (
    <div className={`group flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {/*
        Avatar sits beside incoming messages only, and only on the first of a
        run — repeating it on every line is what makes a group chat read as a
        feed. The spacer keeps the rest of the run aligned under it.
      */}
      {!isMine &&
        (startsRun ? (
          <button
            type="button"
            onClick={() =>
              message.authorUsername && onOpenProfile(message.authorUsername)
            }
            aria-label={`Open profile of ${message.authorUsername ?? "user"}`}
            className="shrink-0 rounded-full transition-opacity hover:opacity-80"
          >
            <Avatar username={message.authorUsername} url={message.authorAvatarUrl} />
          </button>
        ) : (
          <span className="w-7 shrink-0" aria-hidden />
        ))}

      <div className="relative flex max-w-[80%] flex-col sm:max-w-[65%]">
        <div
          className={`relative px-2 pt-[5px] shadow-sm ${
            message.reactions.length > 0 ? "pb-3.5" : "pb-[5px]"
          } ${tail} ${
            isMine ? "bg-bubble-out text-bubble-out-ink" : "bg-bubble-in text-bubble-in-ink"
          } ${isPending ? "opacity-60" : ""}`}
          style={{ borderRadius: 8 }}
        >
          {!isMine && startsRun && (
            <button
              type="button"
              onClick={() =>
                message.authorUsername && onOpenProfile(message.authorUsername)
              }
              className="mb-px block text-[12.5px] font-semibold hover:underline"
              style={{ color: nameColour(message.authorUsername) }}
            >
              @{message.authorUsername ?? "deleted"}
            </button>
          )}

          {message.replyTo && (
            <button
              type="button"
              onClick={() => onJumpTo(message.replyTo!.id)}
              className="mb-1 flex w-full items-stretch gap-2 overflow-hidden rounded bg-black/15 text-left transition-opacity hover:opacity-85 dark:bg-black/25"
            >
              <span
                aria-hidden
                className="w-1 shrink-0 rounded-full"
                style={{ backgroundColor: nameColour(message.replyTo.authorUsername) }}
              />
              <span className="min-w-0 flex-1 py-1 pr-2">
                <span
                  className="block text-[12px] font-semibold"
                  style={{ color: nameColour(message.replyTo.authorUsername) }}
                >
                  @{message.replyTo.authorUsername ?? "deleted"}
                </span>
                {/* One line only: a quote should hint at the original, not repeat it. */}
                <span className="block truncate text-[12.5px] opacity-70">
                  {message.replyTo.body}
                </span>
              </span>
            </button>
          )}

          <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.32]">
            {message.body}
            {/* Reserves space on the last line so the timestamp never overlaps. */}
            <span className="inline-block w-16 select-none" aria-hidden />
          </p>

          <span className="-mt-4 flex items-center justify-end gap-1 text-[10.5px] text-bubble-meta">
            {message.editedAt && <span>edited</span>}
            {timeOf(message.createdAt)}
            {isMine && (
              <span aria-hidden className="text-[12px] leading-none">
                {isPending ? "🕘" : "✓✓"}
              </span>
            )}
          </span>
        </div>

        {message.reactions.length > 0 && (
          <div
            className={`relative z-10 -mt-2.5 flex flex-wrap gap-1 ${
              isMine ? "justify-end pr-2" : "justify-start pl-2"
            }`}
          >
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReact(message.id, reaction.emoji)}
                aria-pressed={reaction.mine}
                title={reaction.mine ? "Remove your reaction" : "React"}
                className={`flex items-center gap-0.5 rounded-full px-1.5 py-px text-[11px] leading-[1.5] shadow-sm ring-1 transition-colors ${
                  reaction.mine
                    ? "bg-accent-soft text-accent ring-accent/40"
                    : "bg-raised text-muted ring-line hover:text-ink"
                }`}
              >
                <span className="text-[12px] leading-none">{reaction.emoji}</span>
                {reaction.count > 1 && <span className="font-medium">{reaction.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hidden until hover on a pointer device, and always reachable by keyboard. */}
      {!isPending && (
        <div className="relative flex items-center self-center">
          <button
            type="button"
            onClick={() => onReply(message)}
            aria-label="Reply to message"
            className="flex h-7 w-7 items-center justify-center rounded-full text-faint opacity-0 transition-opacity hover:bg-raised hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                d="M10 9V5l-7 7 7 7v-4.1c5 0 8 1.6 10 5.1-1-5-4-10-10-11z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label="React to message"
            aria-expanded={pickerOpen}
            className="flex h-7 w-7 items-center justify-center rounded-full text-faint opacity-0 transition-opacity hover:bg-raised hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="9" cy="10" r="1.2" fill="currentColor" />
              <circle cx="15" cy="10" r="1.2" fill="currentColor" />
              <path
                d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {pickerOpen && (
            <>
              {/*
                Click-away layer. A document listener would fight the trigger
                button's own onClick and close-then-reopen the picker.
              */}
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setPickerOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                className={`absolute bottom-9 z-20 flex gap-0.5 rounded-full border border-line bg-surface px-1.5 py-1 shadow-lg ${
                  isMine ? "right-0" : "left-0"
                }`}
              >
                {REACTION_EMOJI.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setPickerOpen(false);
                    }}
                    aria-label={`React with ${emoji}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
