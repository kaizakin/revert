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
  syncPresence,
  fetchPinned,
  setPinnedAction,
  fetchNewMessages,
  markRoomRead,
  refetchMessages,
  sendMessageAction,
  toggleReactionAction,
  type SendState,
} from "../actions";
import { GroupPanel } from "./group-panel";
import { MemberPanel } from "./member-panel";
import { MentionMenu, activeMentionQuery } from "./mention-menu";
import { SearchPanel } from "./search-panel";
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
  /** Pinning is a moderation action, so only mods get the affordance. */
  canPin: boolean;
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
  stats: initialStats,
  conversationId,
  meId,
  meUsername,
  canPost,
  canPin,
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
  /**
   * Polled counts are tagged with the room they came from, and the server
   * render is used until a poll for this room lands. Copying the prop into
   * state and re-syncing it in an effect would be the obvious approach and
   * causes a cascading render — and briefly shows the previous room's counts.
   */
  const [polled, setPolled] = useState<{
    slug: string;
    stats: { total: number; active: number };
  } | null>(null);

  const stats = polled?.slug === slug ? polled.stats : initialStats;
  const [pinned, setPinned] = useState<{
    id: string;
    body: string | null;
    authorUsername: string | null;
  } | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageRow | null>(null);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);

  const refreshPresence = useCallback(() => {
    void syncPresence(slug).then((next) => {
      if (next) setPolled({ slug, stats: next });
    });
  }, [slug]);

  /**
   * Poll while the tab is visible.
   *
   * 45 seconds against a five-minute activity window, so a reader stays marked
   * present with margin to spare. Hidden tabs are skipped — a backgrounded tab
   * reporting presence would show people as online who walked away hours ago,
   * and would keep polling for nothing.
   */
  useEffect(() => {
    refreshPresence();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshPresence();
    }, 45_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshPresence();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshPresence]);

  const refreshPinned = useCallback(() => {
    void fetchPinned(slug).then(setPinned);
  }, [slug]);

  useEffect(() => {
    refreshPinned();
  }, [refreshPinned]);

  const togglePin = useCallback(
    async (messageId: string) => {
      const next = pinned?.id === messageId ? null : messageId;
      const result = await setPinnedAction(slug, next);
      if (result.error) {
        setReactError(result.error);
        return;
      }
      setReactError(null);
      refreshPinned();
    },
    [slug, pinned, refreshPinned],
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Replace the @token the caret sits in, then put the caret after the inserted
   * handle. Without moving it the caret would jump to the end of the message,
   * which is wrong when mentioning someone mid-sentence.
   */
  const insertMention = useCallback(
    (username: string) => {
      const el = textareaRef.current;
      if (!el || !mention) return;

      const before = draft.slice(0, mention.start);
      const after = draft.slice(el.selectionStart ?? draft.length);
      const inserted = `@${username} `;

      setDraft(before + inserted + after);
      setMention(null);

      requestAnimationFrame(() => {
        const caret = before.length + inserted.length;
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [draft, mention],
  );

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
    | { kind: "member"; username: string }
    | { kind: "group" }
    | { kind: "search" }
    | null
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
      readByAll: false,
      replyToId: replyingTo?.id ?? null,
      replyTo: replyingTo
        ? { id: replyingTo.id, authorUsername: replyingTo.authorUsername, body: replyingTo.body }
        : null,
      reactions: [],
    },
  ]);

  /**
   * Hide the optimistic copy once the real message lands.
   *
   * Two things add a sent message: useOptimistic shows it instantly, and the
   * realtime broadcast fetches the saved row a moment later. Between those two
   * the same message was on screen twice.
   *
   * Matching on author and body is deliberate — the optimistic row has a
   * client-only id, so there is nothing to match on. Sending the identical text
   * twice in quick succession collapses to one bubble for a fraction of a
   * second, which is a far better failure than every message flickering double.
   */
  const visible = useMemo(() => {
    const hasPending = optimistic.some((m) => m.id.startsWith("pending-"));
    if (!hasPending) return optimistic;

    const mine = messages.filter((m) => m.authorId === meId);

    return optimistic.filter((m) => {
      if (!m.id.startsWith("pending-")) return true;

      const draftBody = (m.body ?? "").trim();
      const draftAt = new Date(m.createdAt).getTime();

      /**
       * Compared against the draft's own timestamp rather than the clock, so
       * this stays a pure function of its inputs — and so repeating something
       * you also said an hour ago does not hide the new bubble until the round
       * trip finishes.
       */
      return !mine.some(
        (settled) =>
          (settled.body ?? "").trim() === draftBody &&
          Math.abs(new Date(settled.createdAt).getTime() - draftAt) < 60_000,
      );
    });
  }, [optimistic, messages, meId]);

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
  }, [visible.length]);

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
      visible.map((message, index) => {
        const previous = index > 0 ? visible[index - 1] : null;

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
    [visible],
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        {/* Back to the chat list, which is the only nav on a phone. */}
        <Link
          href="/chat"
          aria-label="Back to chats"
          className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink md:hidden"
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

          {/* Search replaces the menu: the menu had nothing behind it. */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPanel({ kind: "search" });
            }}
            aria-label="Search messages"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M16.5 16.5L21 21"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </button>
      </div>
      {pinned && (
        <button
          type="button"
          onClick={() => jumpTo(pinned.id)}
          className="flex w-full items-center gap-2 border-b border-line bg-surface px-4 py-2 text-left transition-colors hover:bg-raised"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent" aria-hidden>
            <path
              d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-accent">
              Pinned
            </span>
            <span className="block truncate text-[12.5px] text-muted">
              @{pinned.authorUsername ?? "deleted"}: {pinned.body}
            </span>
          </span>
        </button>
      )}

      <div className="chat-pattern flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-3 py-4 sm:px-6">
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
                  onTogglePin={canPin ? togglePin : undefined}
                  isPinned={pinned?.id === message.id}
                />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6">
          {canPost ? (
            <form
              ref={formRef}
              action={(formData) => {
                const body = String(formData.get("body") ?? "").trim();
                if (!body) return;
                addOptimistic(body);
                setDraft("");
                setReplyingTo(null);
                setMention(null);
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

              <div className="relative flex items-end gap-2">
                {mention && (
                  <MentionMenu
                    slug={slug}
                    query={mention.query}
                    onPick={insertMention}
                    onClose={() => setMention(null)}
                  />
                )}

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
                  ref={textareaRef}
                  name="body"
                  rows={1}
                  required
                  maxLength={4000}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setMention(
                      activeMentionQuery(event.target.value, event.target.selectionStart ?? 0),
                    );
                  }}
                  onSelect={(event) => {
                    const el = event.currentTarget;
                    setMention(activeMentionQuery(el.value, el.selectionStart ?? 0));
                  }}
                  onBlur={() => setMention(null)}
                  placeholder="Type a message"
                  className="max-h-32 flex-1 resize-none rounded-lg bg-raised px-4 py-2.5 text-[14.5px] text-ink outline-none placeholder:text-faint"
                  onKeyDown={(event) => {
                    // The mention menu claims Enter while it is open, so a pick
                    // does not also send the message.
                    if (mention) return;

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

      {panel?.kind === "search" && (
        <SearchPanel slug={slug} onClose={() => setPanel(null)} onJumpTo={jumpTo} />
      )}

      {panel?.kind === "group" && (
        <GroupPanel
          slug={slug}
          onClose={() => setPanel(null)}
          onOpenMember={(username) => setPanel({ kind: "member", username })}
          refreshKey={stats.total}
        />
      )}
    </div>
  );
}
