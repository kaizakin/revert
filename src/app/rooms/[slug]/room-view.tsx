"use client";

import { useActionState, useCallback, useEffect, useMemo, useOptimistic, useRef, useState } from "react";

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

function timeOf(value: Date | string) {
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function dayOf(value: Date | string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
   * revalidation and puts two sources of truth one race apart.
   */
  const [live, setLive] = useState<MessageRow[]>([]);

  const [state, action, pending] = useActionState<SendState, FormData>(sendMessageAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const seen = new Set(initialMessages.map((m) => m.id));
    // Anything the server has now rendered is dropped from the live overlay.
    const overlay = live.filter((m) => !seen.has(m.id));
    return [...initialMessages, ...overlay];
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

  // Read from a ref inside the subscription so a new message does not tear
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
   * The broadcast carries only an id, never message text, so a forged event
   * cannot inject content — at most it triggers a fetch that returns rows this
   * user is already allowed to read.
   */
  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message.new" }, () => {
        void catchUp();
      })
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

  // Day separators are computed here rather than by mutating a variable while
  // rendering, which produces different output on a second render pass.
  const rendered = useMemo(
    () =>
      optimistic.map((message, index) => {
        const day = dayOf(message.createdAt);
        const previousDay =
          index > 0 ? dayOf(optimistic[index - 1].createdAt) : null;
        return { message, day, showDay: day !== previousDay };
      }),
    [optimistic],
  );

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {rendered.length === 0 && (
          <p className="py-12 text-center text-sm text-black/40 dark:text-white/40">
            No messages yet. Say something.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {rendered.map(({ message, day, showDay }) => {
            const isPending = message.id.startsWith("pending-");

            return (
              <li key={message.id} className="flex flex-col gap-3">
                {showDay && (
                  <div className="pt-2 text-center text-[11px] uppercase tracking-wide text-black/35 dark:text-white/35">
                    {day}
                  </div>
                )}
                <div className={isPending ? "opacity-50" : undefined}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">
                      @{message.authorUsername ?? "deleted"}
                    </span>
                    <span className="text-[11px] text-black/35 dark:text-white/35">
                      {timeOf(message.createdAt)}
                      {message.editedAt ? " · edited" : ""}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-black/10 px-6 py-4 dark:border-white/10">
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
            <div className="flex items-end gap-2">
              <textarea
                name="body"
                rows={1}
                required
                maxLength={4000}
                placeholder={`Message #${slug}`}
                className="max-h-40 flex-1 resize-none rounded-md border border-black/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
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
                className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                Send
              </button>
            </div>
            {state.error && (
              <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
            )}
          </form>
        ) : (
          <p className="text-sm text-black/45 dark:text-white/45">{postDeniedReason}</p>
        )}
      </div>
    </>
  );
}
