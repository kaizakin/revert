"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type { MessageRow } from "@/server/messaging/queries";

import {
  fetchNewMessages,
  markRoomRead,
  sendMessageAction,
  type SendState,
} from "../actions";

type Props = {
  slug: string;
  conversationId: string;
  meId: string;
  meUsername: string;
  canPost: boolean;
  postDeniedReason?: string;
  initialMessages: MessageRow[];
};

/** Consecutive messages from the same person inside this window share a tail. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

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
  if (!username) return "var(--bubble-meta)";
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) | 0;
  return NAME_COLOURS[Math.abs(hash) % NAME_COLOURS.length];
}

const timeOf = (value: Date | string) =>
  new Date(value)
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();

const dayOf = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function dayLabel(value: Date | string) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayOf(value) === dayOf(today)) return "Today";
  if (dayOf(value) === dayOf(yesterday)) return "Yesterday";
  return dayOf(value);
}

export function RoomView({
  slug,
  conversationId,
  meId,
  meUsername,
  canPost,
  postDeniedReason,
  initialMessages,
}: Props) {
  /**
   * Only messages that arrived over realtime live in state. The server-rendered
   * page stays the base list and the two are merged below.
   *
   * Copying props into state and syncing them in an effect is the obvious
   * approach and the wrong one: it triggers a second render on every
   * revalidation and leaves two sources of truth one race apart.
   */
  const [live, setLive] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");

  const [state, action, pending] = useActionState<SendState, FormData>(sendMessageAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const seen = new Set(initialMessages.map((m) => m.id));
    return [...initialMessages, ...live.filter((m) => !seen.has(m.id))];
  }, [initialMessages, live]);

  const [optimistic, addOptimistic] = useOptimistic(messages, (current, draft: string) => [
    ...current,
    {
      id: `pending-${current.length}`,
      body: draft,
      createdAt: new Date(),
      editedAt: null,
      authorId: meId,
      authorUsername: meUsername,
      authorAvatarUrl: null,
      replyToId: null,
    },
  ]);

  // Read through a ref inside the subscription so a new message does not tear
  // down and rebuild the websocket.
  const latestAtRef = useRef<string | null>(null);
  useEffect(() => {
    const last = messages.at(-1)?.createdAt;
    latestAtRef.current = last ? new Date(last).toISOString() : null;
  }, [messages]);

  const catchUp = useCallback(async () => {
    const since = latestAtRef.current ?? new Date(Date.now() - 60_000).toISOString();
    const fresh = await fetchNewMessages(slug, since);
    if (!fresh.length) return;

    setLive((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = fresh.filter((m) => !seen.has(m.id));
      return added.length ? [...prev, ...added] : prev;
    });
  }, [slug]);

  /**
   * The broadcast carries only a message id, never its text, so a forged event
   * can at most trigger a fetch that returns rows this user may already read.
   */
  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message.new" }, () => void catchUp())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, catchUp]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [optimistic.length]);

  const lastRealId = messages.at(-1)?.id;
  useEffect(() => {
    void markRoomRead(slug, lastRealId);
  }, [slug, lastRealId]);

  /**
   * Day separators and bubble grouping are derived from the previous element
   * rather than by mutating a variable mid-render, which would produce
   * different output on a second render pass.
   */
  const rendered = useMemo(
    () =>
      optimistic.map((message, index) => {
        const previous = index > 0 ? optimistic[index - 1] : null;

        const showDay = !previous || dayOf(message.createdAt) !== dayOf(previous.createdAt);

        const withinWindow = (a: MessageRow, b: MessageRow) =>
          Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <
          GROUP_WINDOW_MS;

        const startsRun =
          showDay ||
          !previous ||
          previous.authorId !== message.authorId ||
          !withinWindow(previous, message);


        return { message, showDay, startsRun };
      }),
    [optimistic],
  );

  return (
    <>
      <div className="chat-pattern flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-[3px] px-3 py-4 sm:px-8">
          {rendered.length === 0 && (
            <p className="py-16 text-center text-sm text-bubble-meta">
              No messages yet. Say something.
            </p>
          )}

          {rendered.map(({ message, showDay, startsRun }) => {
            const isMine = message.authorId === meId;
            const isPending = message.id.startsWith("pending-");

            // The tail hangs off the first bubble of a run only, so a run reads
            // as one block rather than a column of separate cards.
            const tail = startsRun ? (isMine ? "tail-out" : "tail-in") : "";

            return (
              <div key={message.id}>
                {showDay && (
                  <div className="flex justify-center py-4">
                    <span className="rounded-lg bg-bubble-in px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-bubble-meta shadow-sm">
                      {dayLabel(message.createdAt)}
                    </span>
                  </div>
                )}

                <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[80%] px-2 py-[5px] shadow-sm sm:max-w-[65%] ${tail} ${
                      isMine
                        ? "bg-bubble-out text-bubble-out-ink"
                        : "bg-bubble-in text-bubble-in-ink"
                    } ${isPending ? "opacity-60" : ""}`}
                    style={{ borderRadius: 8 }}
                  >
                    {!isMine && startsRun && (
                      <p
                        className="mb-px text-[12.5px] font-semibold"
                        style={{ color: nameColour(message.authorUsername) }}
                      >
                        @{message.authorUsername ?? "deleted"}
                      </p>
                    )}

                    <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.32]">
                      {message.body}
                      {/* Reserves room on the last line so the timestamp never
                          overlaps the text. */}
                      <span className="inline-block w-16 select-none" aria-hidden />
                    </p>

                    <span className="-mt-4 flex items-center justify-end gap-1 text-[10.5px] text-bubble-meta">
                      {message.editedAt && <span>edited</span>}
                      {timeOf(message.createdAt)}
                      {isMine && <span aria-hidden>{isPending ? "🕘" : "✓"}</span>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6">
          {canPost ? (
            <form
              ref={formRef}
              action={(formData) => {
                const body = String(formData.get("body") ?? "").trim();
                if (!body) return;
                addOptimistic(body);
                setDraft("");
                return action(formData);
              }}
            >
              <input type="hidden" name="slug" value={slug} />

              <div className="flex items-end gap-2">
                {/* Attachments and emoji land with media support in Phase 2, so
                    they are shown disabled rather than faked. */}
                <span
                  title="Attach — coming in Phase 2"
                  aria-hidden
                  className="mb-1 flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-faint/60"
                >
                  <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" aria-hidden>
                    <path
                      d="M12 5v14M5 12h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>

                <textarea
                  name="body"
                  rows={1}
                  required
                  maxLength={4000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type a message"
                  className="max-h-32 flex-1 resize-none rounded-lg bg-raised px-4 py-2.5 text-[14.5px] text-ink outline-none placeholder:text-faint"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={pending || draft.trim().length === 0}
                  aria-label="Send"
                  className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-all hover:opacity-90 disabled:opacity-30"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                    <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {state.error && <p className="mt-2 px-1 text-xs text-danger">{state.error}</p>}
            </form>
          ) : (
            <p className="py-2 text-center text-sm text-muted">{postDeniedReason}</p>
          )}
        </div>
      </div>
    </>
  );
}
