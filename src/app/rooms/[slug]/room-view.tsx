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

/** Consecutive messages from the same person inside this window share a header. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const timeOf = (value: Date | string) =>
  new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const dayOf = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function dayLabel(value: Date | string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayOf(date) === dayOf(today)) return "Today";
  if (dayOf(date) === dayOf(yesterday)) return "Yesterday";
  return dayOf(date);
}

function Avatar({ username, url }: { username: string | null; url: string | null }) {
  if (url) {
    return (
      // Remote avatars come from Clerk; a plain img avoids configuring remote
      // patterns for a 32px image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold uppercase text-muted">
      {(username ?? "?").slice(0, 2)}
    </span>
  );
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
   * page stays the base list, and the two are merged below.
   *
   * Copying props into state and syncing them in an effect is the obvious
   * approach and the wrong one: it triggers a second render on every
   * revalidation and leaves two sources of truth one race apart.
   */
  const [live, setLive] = useState<MessageRow[]>([]);

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
   * can at most trigger a fetch that returns rows this user is already allowed
   * to read.
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
   * Day separators and author grouping are derived from the previous element
   * rather than by mutating a variable mid-render, which would produce
   * different output on a second render pass.
   */
  const rendered = useMemo(
    () =>
      optimistic.map((message, index) => {
        const previous = index > 0 ? optimistic[index - 1] : null;

        const showDay =
          !previous || dayOf(message.createdAt) !== dayOf(previous.createdAt);

        const sameAuthor = previous?.authorId === message.authorId;
        const withinWindow =
          previous !== null &&
          new Date(message.createdAt).getTime() -
            new Date(previous.createdAt).getTime() <
            GROUP_WINDOW_MS;

        return {
          message,
          showDay,
          grouped: Boolean(sameAuthor && withinWindow && !showDay),
        };
      }),
    [optimistic],
  );

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col px-6 py-6">
          {rendered.length === 0 && (
            <p className="py-16 text-center text-sm text-faint">
              Nothing here yet. Say something.
            </p>
          )}

          <ul className="flex flex-col">
            {rendered.map(({ message, showDay, grouped }) => {
              const isPending = message.id.startsWith("pending-");
              const isMine = message.authorId === meId;

              return (
                <li key={message.id}>
                  {showDay && (
                    <div className="flex items-center gap-3 py-5">
                      <span className="h-px flex-1 bg-line" />
                      <span className="text-[11px] font-medium uppercase tracking-widest text-faint">
                        {dayLabel(message.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  )}

                  <div
                    className={`group flex gap-3 rounded-lg px-2 transition-colors hover:bg-surface ${
                      grouped ? "py-0.5" : "pt-3 pb-0.5"
                    } ${isPending ? "opacity-50" : ""}`}
                  >
                    {grouped ? (
                      <span className="w-8 shrink-0 pt-0.5 text-right text-[10px] text-transparent group-hover:text-faint">
                        {timeOf(message.createdAt)}
                      </span>
                    ) : (
                      <Avatar
                        username={message.authorUsername}
                        url={message.authorAvatarUrl}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      {!grouped && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-ink">
                            @{message.authorUsername ?? "deleted"}
                          </span>
                          {isMine && (
                            <span className="rounded bg-raised px-1.5 text-[10px] font-medium text-muted">
                              you
                            </span>
                          )}
                          <span className="text-[11px] text-faint">
                            {timeOf(message.createdAt)}
                            {message.editedAt ? " · edited" : ""}
                          </span>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">
                        {message.body}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-3xl px-6 py-4">
          {canPost ? (
            <form
              ref={formRef}
              action={(formData) => {
                const body = String(formData.get("body") ?? "").trim();
                if (!body) return;
                addOptimistic(body);
                formRef.current?.reset();
                return action(formData);
              }}
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="slug" value={slug} />

              <div className="flex items-end gap-2 rounded-xl border border-line bg-canvas px-3 py-2 transition-colors focus-within:border-accent">
                <textarea
                  name="body"
                  rows={1}
                  required
                  maxLength={4000}
                  placeholder={`Message #${slug}`}
                  className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-ink outline-none placeholder:text-faint"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="mb-0.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Send
                </button>
              </div>

              {state.error ? (
                <p className="px-1 text-xs text-danger">{state.error}</p>
              ) : (
                <p className="px-1 text-[11px] text-faint">
                  Enter to send, Shift + Enter for a new line
                </p>
              )}
            </form>
          ) : (
            <p className="py-2 text-sm text-muted">{postDeniedReason}</p>
          )}
        </div>
      </div>
    </>
  );
}
