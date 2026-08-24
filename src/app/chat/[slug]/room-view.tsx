"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react";

import { avatarColour, initials } from "@/lib/avatar";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { MessageRow } from "@/server/messaging/queries";

import {
  fetchNewMessages,
  markRoomRead,
  refetchMessages,
  sendMessageAction,
  toggleReactionAction,
  type SendState,
} from "../actions";
import { GroupPanel } from "./group-panel";
import { MemberPanel } from "./member-panel";
import { MessageBubble } from "./message-bubble";

type Props = {
  slug: string;
  name: string;
  note?: string;
  stats: { total: number; active: number };
  conversationId: string;
  meId: string;
  meUsername: string;
  canPost: boolean;
  postDeniedReason?: string;
  initialMessages: MessageRow[];
};

/** Consecutive messages from the same person inside this window share a tail. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

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
  name,
  note,
  stats,
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
  const [reactError, setReactError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageRow | null>(null);

  /**
   * Scroll a quoted message into view and flash it, so tapping a quote lands
   * somewhere obvious rather than just moving the scroll position.
   */
  const jumpTo = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("msg-flash");
    window.setTimeout(() => el.classList.remove("msg-flash"), 1200);
  }, []);
  /**
   * One slot for the right-hand panel. Group info and a member profile are
   * mutually exclusive, so a single value avoids the state where both are set.
   */
  const [panel, setPanel] = useState<
    { kind: "member"; username: string } | { kind: "group" } | null
  >(null);

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
      replyToId: replyingTo?.id ?? null,
      replyTo: replyingTo
        ? { id: replyingTo.id, authorUsername: replyingTo.authorUsername, body: replyingTo.body }
        : null,
      reactions: [],
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

  const reload = useCallback(async () => {
    const fresh = await refetchMessages(slug);
    if (fresh.length) setLive(fresh);
  }, [slug]);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      const result = await toggleReactionAction(slug, messageId, emoji);
      if (result.error) {
        setReactError(result.error);
        return;
      }
      setReactError(null);
      await reload();
    },
    [slug, reload],
  );

  /**
   * The broadcast carries only a message id, never its text, so a forged event
   * can at most trigger a fetch that returns rows this user may already read.
   *
   * Reactions cannot use the "since this timestamp" path — they change older
   * messages, which that query would never return — so they trigger a reload.
   */
  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message.new" }, () => void catchUp())
      .on("broadcast", { event: "reaction.changed" }, () => void reload())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, catchUp, reload]);

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
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        {/* Back to the chat list, which is the only nav on a phone. */}
        <Link
          href="/chat"
          aria-label="Back to chats"
          className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink sm:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => setPanel({ kind: "group" })}
          aria-label="Open group info"
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-90"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ backgroundColor: avatarColour(slug) }}
            aria-hidden
          >
            {initials(name)}
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-ink">{name}</h1>
            <p className="truncate text-[12px] text-muted">
              {stats.total} {stats.total === 1 ? "member" : "members"}
              {stats.active > 0 && ` · ${stats.active} online`}
              {note ? ` · ${note}` : ""}
            </p>
          </div>

          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <circle cx="12" cy="5" r="1.6" fill="currentColor" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              <circle cx="12" cy="19" r="1.6" fill="currentColor" />
            </svg>
          </span>
        </button>
      </div>
      <div className="chat-pattern flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col px-3 py-4 sm:px-8">
          {rendered.length === 0 && (
            <p className="py-16 text-center text-sm text-bubble-meta">
              No messages yet. Say something.
            </p>
          )}

          {rendered.map(({ message, showDay, startsRun }) => {
            const isMine = message.authorId === meId;
            const isPending = message.id.startsWith("pending-");

            return (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={`rounded-lg ${startsRun ? "mt-2" : "mt-0.5"}`}
              >
                {showDay && (
                  <div className="flex justify-center py-4">
                    <span className="rounded-lg bg-bubble-in px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-bubble-meta shadow-sm">
                      {dayLabel(message.createdAt)}
                    </span>
                  </div>
                )}

                <MessageBubble
                  message={message}
                  isMine={isMine}
                  isPending={isPending}
                  startsRun={startsRun}
                  onReact={handleReact}
                  onOpenProfile={(username) => setPanel({ kind: "member", username })}
                  onReply={setReplyingTo}
                  onJumpTo={jumpTo}
                />
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
                setReplyingTo(null);
                return action(formData);
              }}
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="replyToId" value={replyingTo?.id ?? ""} />

              {replyingTo && (
                <div className="mb-2 flex items-stretch gap-2 overflow-hidden rounded-lg bg-raised">
                  <span
                    aria-hidden
                    className="w-1 shrink-0"
                    style={{ backgroundColor: "var(--rv-accent)" }}
                  />
                  <span className="min-w-0 flex-1 py-1.5">
                    <span className="block text-[12px] font-semibold text-accent">
                      Replying to @{replyingTo.authorUsername ?? "deleted"}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {replyingTo.body}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    aria-label="Cancel reply"
                    className="px-3 text-muted transition-colors hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              )}

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

              {(state.error ?? reactError) && (
                <p className="mt-2 px-1 text-xs text-danger">{state.error ?? reactError}</p>
              )}
            </form>
          ) : (
            <p className="py-2 text-center text-sm text-muted">{postDeniedReason}</p>
          )}
        </div>
      </div>
      </div>

      {panel?.kind === "member" && (
        <MemberPanel
          key={panel.username}
          username={panel.username}
          onClose={() => setPanel(null)}
        />
      )}

      {panel?.kind === "group" && (
        <GroupPanel
          slug={slug}
          onClose={() => setPanel(null)}
          onOpenMember={(username) => setPanel({ kind: "member", username })}
        />
      )}
    </div>
  );
}
