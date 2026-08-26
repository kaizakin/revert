"use client";

import { useMemo, useState } from "react";

import { BubbleTail, Tick } from "@/components/bubble-marks";
import { renderRichText } from "@/lib/rich-text";
import { Avatar } from "@/components/avatar";
import type { MessageRow } from "@/server/messaging/queries";
import { REACTION_EMOJI } from "@/lib/reactions";
import type { PinDuration } from "@/lib/pins";

import { PinMenu } from "./pin-menu";
import { ReactionSheet } from "./reaction-sheet";

type Props = {
  message: MessageRow;
  isMine: boolean;
  isPending: boolean;
  startsRun: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onOpenProfile: (username: string) => void;
  onReply: (message: MessageRow) => void;
  onJumpTo: (messageId: string) => void;
  /** Undefined for anyone without permission, so the button simply is not shown. */
  /** Only passed to mods. Absent means the control is not drawn at all. */
  /** Mods only. Takes the message down for the whole room. */
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, duration: PinDuration) => void;
  onUnpin?: (messageId: string) => void;
  isPinned?: boolean;
  /** So the menu can warn before a pin pushes another one out. */
  pinsAtCapacity?: boolean;
  oldestPinBody?: string | null;
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

export function MessageBubble({
  message,
  isMine,
  isPending,
  startsRun,
  onReact,
  onOpenProfile,
  onReply,
  onJumpTo,
  onDelete,
  onPin,
  onUnpin,
  isPinned,
  pinsAtCapacity,
  oldestPinBody,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pinMenuOpen, setPinMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /**
   * Collapsed to what a pill can hold: the three most-used emoji and a total.
   * Sorted by count so the pill shows what the room actually chose, with the
   * viewer's own kept in view — seeing your own reaction drop out of sight as
   * others pile on reads as it having been lost.
   */
  const reactionSummary = useMemo(() => {
    if (message.reactions.length === 0) return null;

    const ranked = [...message.reactions].sort(
      (a, b) => Number(b.mine) - Number(a.mine) || b.count - a.count,
    );

    return {
      shown: ranked.slice(0, 3),
      total: message.reactions.reduce((sum, r) => sum + r.count, 0),
      mine: message.reactions.some((r) => r.mine),
    };
  }, [message.reactions]);

  return (
    <div
      className={`group relative flex items-start gap-2 transition-all ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar sits beside incoming messages on the first of a run */}
      {!isMine &&
        (startsRun ? (
          <button
            type="button"
            onClick={() => message.authorUsername && onOpenProfile(message.authorUsername)}
            aria-label={`Open profile of ${message.authorUsername ?? "user"}`}
            className="mt-0.5 shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            <Avatar
              src={message.authorAvatarUrl}
              name={message.authorUsername ?? "?"}
              size={30}
              className="ring-1 ring-line/50"
            />
          </button>
        ) : (
          <span className="w-[30px] shrink-0" aria-hidden />
        ))}

      <div className="relative flex max-w-[85%] flex-col sm:max-w-[75%] lg:max-w-[65%]">
        <div
          className={`relative px-3 pt-1.5 shadow-sm transition-all ${
            message.reactions.length > 0 ? "pb-3.5" : "pb-1.5"
          } ${
            isMine
              ? "bg-bubble-out text-bubble-out-ink border border-emerald-500/10 dark:border-emerald-400/10"
              : "bg-bubble-in text-bubble-in-ink border border-line/40"
          } ${isPending ? "opacity-70 ring-1 ring-accent/30 animate-pulse" : ""}`}
          style={{
            borderRadius: startsRun
              ? isMine
                ? "12px 2px 12px 12px"
                : "2px 12px 12px 12px"
              : "12px",
          }}
        >
          {/* The tail inherits the bubble colour through currentColor */}
          {startsRun && (
            <span aria-hidden className={isMine ? "text-bubble-out" : "text-bubble-in"}>
              <BubbleTail side={isMine ? "right" : "left"} />
            </span>
          )}

          {/* Pinned pill tag inside bubble if message is pinned */}
          {isPinned && (
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider text-accent uppercase">
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
                <path d="M16 4h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1l-1 5 2 2v1H7v-1l2-2-1-5H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1l1-3h6l1 3z" />
              </svg>
              <span>Pinned Message</span>
            </div>
          )}

          {!isMine && startsRun && (
            <button
              type="button"
              onClick={() => message.authorUsername && onOpenProfile(message.authorUsername)}
              className="mb-0.5 block text-[13px] font-bold tracking-tight transition-opacity hover:opacity-85"
              style={{ color: nameColour(message.authorUsername) }}
            >
              @{message.authorUsername ?? "deleted"}
            </button>
          )}

          {message.replyTo && (
            <button
              type="button"
              onClick={() => onJumpTo(message.replyTo!.id)}
              className="mb-1.5 flex w-full items-stretch gap-2 overflow-hidden rounded-lg bg-black/5 text-left transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <span
                aria-hidden
                className="w-1 shrink-0 rounded-l-lg"
                style={{ backgroundColor: nameColour(message.replyTo.authorUsername) }}
              />
              <span className="min-w-0 flex-1 py-1 pr-2">
                <span
                  className="block text-[11.5px] font-semibold"
                  style={{ color: nameColour(message.replyTo.authorUsername) }}
                >
                  @{message.replyTo.authorUsername ?? "deleted"}
                </span>
                <span className="block truncate text-[12px] opacity-75">
                  {message.replyTo.body}
                </span>
              </span>
            </button>
          )}

          <p className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed select-text">
            {renderRichText(message.body, onOpenProfile)}
            {/* Reserves space on the last line so timestamp never overlaps */}
            <span
              className={`inline-block select-none ${isMine ? "w-[72px]" : "w-12"}`}
              aria-hidden
            />
          </p>

          <span className="-mt-4 flex items-center justify-end gap-1 text-[10.5px] font-medium leading-none text-bubble-meta select-none">
            {message.editedAt && <span className="opacity-75">edited</span>}
            <span>{timeOf(message.createdAt)}</span>
            {isMine && (
              <Tick state={isPending ? "pending" : message.readByAll ? "read" : "sent"} />
            )}
          </span>
        </div>

        {/*
          One pill, not one per emoji.
          
          A badge each meant six readers picking six different emoji stretched
          the message to fit them, so the bubble's width reported how popular it
          was rather than how long it was. This shows the three most-used and a
          total, which is a fixed width whatever the room does — and since a
          person now gets one reaction, three covers almost everything.
        */}
        {reactionSummary && (
          <div
            className={`relative z-10 -mt-2.5 flex ${
              isMine ? "justify-end pr-1.5" : "justify-start pl-1.5"
            }`}
          >
            <button
              type="button"
              onClick={() => setSheetOpen((open) => !open)}
              aria-label={`${reactionSummary.total} ${
                reactionSummary.total === 1 ? "reaction" : "reactions"
              }. See who reacted`}
              title="See who reacted"
              className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shadow-sm transition-all duration-150 active:scale-95 ${
                reactionSummary.mine
                  ? "bg-accent/15 ring-1 ring-accent/40"
                  : "bg-surface ring-1 ring-line hover:bg-raised"
              }`}
            >
              {reactionSummary.shown.map((reaction) => (
                <span key={reaction.emoji} className="text-[13px] leading-none">
                  {reaction.emoji}
                </span>
              ))}

              {/* One reaction needs no number; the emoji already says one. */}
              {reactionSummary.total > 1 && (
                <span
                  className={`ml-0.5 text-[11px] font-semibold leading-none ${
                    reactionSummary.mine ? "text-accent" : "text-muted"
                  }`}
                >
                  {reactionSummary.total}
                </span>
              )}
            </button>

            {sheetOpen && (
              <ReactionSheet
                messageId={message.id}
                summary={message.reactions}
                isMine={isMine}
                onReact={onReact}
                onClose={() => setSheetOpen(false)}
                onOpenProfile={(username) => {
                  setSheetOpen(false);
                  onOpenProfile(username);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Floating Action Bar on hover */}
      {!isPending && (
        <div
          className={`relative flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 self-center ${
            isMine ? "order-first" : ""
          }`}
        >
          <div className="flex items-center gap-0.5 rounded-full border border-line/60 bg-surface/95 px-1 py-0.5 shadow-sm backdrop-blur-md">
            {/* Reaction picker trigger */}
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-label="React to message"
              aria-expanded={pickerOpen}
              title="Add reaction"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink active:scale-90"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                <circle cx="15" cy="10" r="1.2" fill="currentColor" />
                <path
                  d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Reply action */}
            <button
              type="button"
              onClick={() => onReply(message)}
              aria-label="Reply to message"
              title="Reply"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink active:scale-90"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  d="M10 9V5l-7 7 7 7v-4.1c5 0 8 1.6 10 5.1-1-5-4-10-10-11z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Pin action (mods only) */}
            {onPin && (
              <button
                type="button"
                onClick={() =>
                  isPinned ? onUnpin?.(message.id) : setPinMenuOpen((open) => !open)
                }
                aria-label={isPinned ? "Unpin message" : "Pin message"}
                title={isPinned ? "Unpin" : "Pin message"}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors active:scale-90 ${
                  isPinned
                    ? "text-accent bg-accent-soft"
                    : "text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            {/*
              Two taps, because this cannot be undone for anybody. The second
              tap is the confirmation — a dialog for one destructive button on a
              hover bar is more ceremony than the action needs, and an accidental
              first tap costs nothing.
            */}
            {onDelete && (
              <button
                type="button"
                onClick={() => (confirmDelete ? onDelete(message.id) : setConfirmDelete(true))}
                onBlur={() => setConfirmDelete(false)}
                aria-label={confirmDelete ? "Confirm delete for everyone" : "Delete message"}
                title={confirmDelete ? "Tap again to delete for everyone" : "Delete message"}
                className={`flex h-7 items-center justify-center gap-1 rounded-full px-1.5 transition-colors active:scale-90 ${
                  confirmDelete
                    ? "bg-danger/15 text-danger"
                    : "w-7 text-muted hover:bg-raised hover:text-danger"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path
                    d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M11 11v5M13 11v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {confirmDelete && (
                  <span className="whitespace-nowrap text-[11px] font-semibold">Sure?</span>
                )}
              </button>
            )}

            {pinMenuOpen && onPin && (
              <PinMenu
                align={isMine ? "right" : "left"}
                atCapacity={Boolean(pinsAtCapacity)}
                replacing={oldestPinBody ?? null}
                onPick={(duration) => {
                  onPin(message.id, duration);
                  setPinMenuOpen(false);
                }}
                onClose={() => setPinMenuOpen(false)}
              />
            )}
          </div>

          {/* Quick Reaction Floating Popover */}
          {pickerOpen && (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setPickerOpen(false)}
                className="fixed inset-0 z-30 cursor-default bg-transparent"
              />
              <div
                className={`absolute bottom-full mb-1.5 z-40 flex items-center gap-1 rounded-full border border-line bg-surface/95 px-2 py-1 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
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
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-all duration-150 hover:scale-135 hover:bg-raised/70 active:scale-95"
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
