"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar } from "@/components/avatar";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabaseBrowser } from "@/lib/supabase-browser";
import type {
  MessageRow,
  PinnedMessage,
  RoomSummary,
  UnreadMarker,
} from "@/server/messaging/queries";
import {
  applyOwnReaction,
  moveOwnReactor,
  type ReactorGroup,
} from "@/lib/reactions";

import {
  syncPresence,
  fetchPinned,
  setPinnedAction,
  fetchNewMessages,
  fetchOlderMessages,
  markRoomRead,
  refetchMessages,
  sendMessageAction,
  toggleReactionAction,
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
  avatarUrl: string | null;
  meAvatarUrl?: string | null;
  conversationId: string;
  meId: string;
  meUsername: string;
  canPost: boolean;
  /** Pinning is a moderation action, so only mods get the affordance. */
  canPin: boolean;
  postDeniedReason?: string;
  initialMessages: MessageRow[];
  /** Where the room opens and where the new-messages line goes. */
  marker: UnreadMarker;
};

/**
 * How long a typing ping stands for. Comfortably longer than the interval
 * between pings, so an ordinary pause between words does not flicker the name
 * off and back on.
 */
/** Where the composer stops growing and starts scrolling. Matches max-h-36. */
const COMPOSER_MAX_HEIGHT = 144;

const TYPING_TTL = 4000;
const TYPING_PING_EVERY = 1000;

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
  avatarUrl,
  meAvatarUrl,
  conversationId,
  meId,
  meUsername,
  canPost,
  canPin,
  postDeniedReason,
  initialMessages,
  marker,
}: Props) {
  const queryClient = useQueryClient();

  const { data: messages = initialMessages } = useQuery<MessageRow[]>({
    queryKey: ["chat", "messages", slug],
    queryFn: () => refetchMessages(slug),
    initialData: initialMessages,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const { data: stats = initialStats } = useQuery<{ total: number; active: number }>({
    queryKey: ["chat", "presence", slug],
    queryFn: async () => {
      const next = await syncPresence(slug);
      return next ?? initialStats;
    },
    initialData: initialStats,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 1000 * 30,
  });

  const { data: pinned = null } = useQuery<PinnedMessage | null>({
    queryKey: ["chat", "pinned", slug],
    queryFn: () => fetchPinned(slug),
    staleTime: 1000 * 60 * 5,
  });

  /**
   * History paged in by scrolling up.
   *
   * Deliberately not merged into the messages cache: that query re-reads the
   * newest page every five seconds and replaces what it holds, so anything paged
   * in would be wiped on the next tick. Tagged with the room it belongs to so
   * changing rooms cannot show the previous room's history — the component stays
   * mounted across that change, and clearing it in an effect would cost a second
   * render before paint.
   */
  const [loaded, setLoaded] = useState<{
    slug: string;
    rows: MessageRow[];
    reachedStart: boolean;
  }>({ slug, rows: [], reachedStart: false });

  const history = loaded.slug === slug ? loaded : { slug, rows: [], reachedStart: false };

  /** The live channel, for telling the room this person is typing. */
  const typingChannel = useRef<RealtimeChannel | null>(null);

  const pingTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingPing.current < TYPING_PING_EVERY) return;

    lastTypingPing.current = now;
    void typingChannel.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { username: meUsername, avatarUrl: meAvatarUrl },
    });
  }, [meUsername, meAvatarUrl]);

  /** Stable, so every bubble is not re-rendered by a fresh object each time. */
  const meProfile = useMemo(
    () => ({ username: meUsername, avatarUrl: meAvatarUrl ?? null }),
    [meUsername, meAvatarUrl],
  );

  /** Guards against a second fetch while one is in flight. */
  const loadingOlder = useRef(false);
  /** The same fact as the ref, for rendering. A ref alone would not repaint. */
  const [fetchingOlder, setFetchingOlder] = useState(false);
  /** Scroll height captured before a prepend, so the view can be pinned after it. */
  const anchor = useRef<number | null>(null);
  /**
   * The current timeline, read by the loader without being a dependency of it.
   * Taking it as one would rebuild the loader on every poll, and the scroll
   * handler holding a stale copy is worse than the handler being rebuilt.
   */
  const timelineRef = useRef<MessageRow[]>([]);

  /**
   * Who is typing, and until when.
   *
   * Each keystroke broadcast renews an expiry rather than pairing a start with a
   * stop, because a stop is the message that goes missing — someone closing the
   * tab or losing signal never sends one, and their name would sit in the header
   * forever. Nothing arriving for TYPING_TTL is what ends it.
   */
  const [typing, setTyping] = useState<
    { username: string; avatarUrl: string | null; until: number }[]
  >([]);
  /** When we last told the room, so a fast typist sends one ping a second. */
  const lastTypingPing = useRef(0);

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [reactError, setReactError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageRow | null>(null);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

  const loadOlder = useCallback(async () => {
    if (loadingOlder.current || history.reachedStart) return;

    const oldest = timelineRef.current[0];
    if (!oldest) return;

    loadingOlder.current = true;
    setFetchingOlder(true);

    // Captured before the request so the pin below has something to measure
    // against, whatever else changes the list while this is in flight.
    const el = scrollContainerRef.current;
    if (el) anchor.current = el.scrollHeight;

    try {
      const page = await fetchOlderMessages(slug, new Date(oldest.createdAt).toISOString());

      setLoaded((current) => {
        const base =
          current.slug === slug ? current : { slug, rows: [], reachedStart: false };
        const seen = new Set(base.rows.map((m) => m.id));

        return {
          slug,
          rows: [...page.rows.filter((m) => !seen.has(m.id)), ...base.rows],
          reachedStart: page.reachedStart,
        };
      });
    } finally {
      loadingOlder.current = false;
      setFetchingOlder(false);
    }
  }, [slug, history.reachedStart]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 250);

    /*
     * Fetches before the top is actually reached, so the next page is usually
     * already in place by the time it would be needed. Waiting for scrollTop of
     * zero means every reader hits a wall first and then waits.
     */
    if (el.scrollTop < 400) void loadOlder();
  }, [loadOlder]);

  const togglePin = useCallback(
    async (messageId: string) => {
      const isCurrentPinned = pinned?.id === messageId;
      const nextPinnedId = isCurrentPinned ? null : messageId;

      // Optimistic update for pin banner
      const currentMsg = messages.find((m) => m.id === messageId);
      const nextPinnedObj: PinnedMessage | null = isCurrentPinned
        ? null
        : currentMsg
          ? {
              id: currentMsg.id,
              body: currentMsg.body,
              authorUsername: currentMsg.authorUsername,
            }
          : null;

      queryClient.setQueryData(["chat", "pinned", slug], nextPinnedObj);

      const result = await setPinnedAction(slug, nextPinnedId);
      if (result.error) {
        setReactError(result.error);
        void queryClient.invalidateQueries({ queryKey: ["chat", "pinned", slug] });
        return;
      }
      setReactError(null);
    },
    [slug, pinned, messages, queryClient],
  );

  /**
   * Replace the @token the caret sits in, then put the caret after the inserted
   * handle. Without moving it the caret would jump to the end of the message.
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
   * Scroll a quoted message into view and flash it with a smooth animation.
   */
  const jumpTo = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("msg-flash");
    window.setTimeout(() => el.classList.remove("msg-flash"), 1400);
  }, []);

  const catchUp = useCallback(async () => {
    const current =
      queryClient.getQueryData<MessageRow[]>(["chat", "messages", slug]) ?? messages;
    const settledMessages = current.filter((m) => !m.id.startsWith("opt-"));
    const last = settledMessages.at(-1)?.createdAt;
    const since = last
      ? new Date(last).toISOString()
      : new Date(Date.now() - 60_000).toISOString();

    const fresh = await fetchNewMessages(slug, since);
    if (!fresh.length) return;

    queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], (prev = current) => {
      const seenIds = new Set(prev.map((m) => m.id));
      const newItems = fresh.filter((m) => !seenIds.has(m.id));
      if (!newItems.length) return prev;

      // Reconcile and remove matching optimistic items
      const newKeys = new Set(
        newItems.map((m) => `${m.authorId}-${(m.body ?? "").trim()}`),
      );
      const filteredPrev = prev.filter((m) => {
        if (!m.id.startsWith("opt-")) return true;
        const key = `${m.authorId}-${(m.body ?? "").trim()}`;
        return !newKeys.has(key);
      });

      return [...filteredPrev, ...newItems];
    });
  }, [slug, messages, queryClient]);

  const reload = useCallback(async () => {
    const fresh = await refetchMessages(slug);
    if (fresh.length) {
      queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], fresh);
    }
  }, [slug, queryClient]);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      /*
       * Applied in one pass so the swap never shows two reactions from the same
       * person — see applyOwnReaction, which is the rule the server follows.
       */
      queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], (prev = []) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions: applyOwnReaction(msg.reactions, emoji) }
            : msg,
        ),
      );

      /*
       * The names behind the pill are a second view of the same fact, so they
       * move here rather than in the sheet. Patching it there meant only the
       * sheet's own buttons updated it, and reacting from the hover picker left
       * the old emoji beside your name.
       */
      queryClient.setQueryData<ReactorGroup[]>(["chat", "reactors", messageId], (prev) =>
        prev ? moveOwnReactor(prev, emoji, meProfile) : prev,
      );

      /* History is held outside that cache, so it needs the same edit. */
      setLoaded((current) => ({
        ...current,
        rows: current.rows.map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions: applyOwnReaction(msg.reactions, emoji) }
            : msg,
        ),
      }));

      const result = await toggleReactionAction(slug, messageId, emoji);
      if (result.error) {
        setReactError(result.error);
        void reload();
      } else {
        setReactError(null);
      }
    },
    [slug, queryClient, reload, meProfile],
  );

  /**
   * Realtime Supabase broadcast listener.
   */
  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "broadcast",
        { event: "message.new" },
        (payload: { payload?: { message?: MessageRow } }) => {
          const incomingMsg = payload?.payload?.message;
          if (incomingMsg) {
            queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], (prev = []) => {
              // Avoid duplicate insertion
              if (prev.some((m) => m.id === incomingMsg.id)) {
                return prev;
              }

              // Reconcile if this replaces an optimistic message by this author
              const optIndex = prev.findIndex(
                (m) =>
                  m.id.startsWith("opt-") &&
                  m.authorId === incomingMsg.authorId &&
                  (m.body ?? "").trim() === (incomingMsg.body ?? "").trim(),
              );

              if (optIndex !== -1) {
                const next = [...prev];
                next[optIndex] = incomingMsg;
                return next;
              }

              return [...prev, incomingMsg];
            });

            // Update sidebar room summary instantly
            queryClient.setQueryData<RoomSummary[]>(["chat", "rooms"], (prev = []) => {
              return prev.map((r) => {
                if (r.id !== conversationId && r.slug !== slug) return r;
                return {
                  ...r,
                  lastBody: incomingMsg.body,
                  lastAuthor: incomingMsg.authorUsername,
                  lastAt: new Date(incomingMsg.createdAt),
                };
              });
            });
          }

          // Catch up in background to reconcile DB sequence and read status
          void catchUp();
        },
      )
      .on("broadcast", { event: "reaction.changed" }, () => void reload())
      .on(
        "broadcast",
        { event: "typing" },
        (payload: { payload?: { username?: string; avatarUrl?: string | null } }) => {
          const who = payload?.payload?.username;
          /* Own keystrokes come back on the same channel. */
          if (!who || who === meUsername) return;

          setTyping((current) => [
            ...current.filter((t) => t.username !== who),
            {
              username: who,
              avatarUrl: payload.payload?.avatarUrl ?? null,
              until: Date.now() + TYPING_TTL,
            },
          ]);
        },
      )
      .subscribe();

    typingChannel.current = channel;

    return () => {
      typingChannel.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, slug, catchUp, reload, queryClient, meUsername]);

  /**
   * Sweeps expired names. Runs only while somebody is typing, so an idle room
   * has no timer at all — and the interval is short enough that a name leaves
   * within a blink of its ping running out.
   */
  useEffect(() => {
    if (typing.length === 0) return;

    const timer = window.setInterval(() => {
      const now = Date.now();
      setTyping((current) =>
        current.some((t) => t.until <= now) ? current.filter((t) => t.until > now) : current,
      );
    }, 700);

    return () => window.clearInterval(timer);
  }, [typing.length]);

  /**
   * Prepending content pushes everything down by its height, so the reader would
   * be thrown backwards by exactly one page every time one loads. Adding that
   * height back leaves the same messages under the cursor.
   *
   * Layout effect rather than effect: this has to run before the browser paints,
   * or the jump is visible as a flicker.
   */
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || anchor.current === null) return;

    const grew = el.scrollHeight - anchor.current;
    anchor.current = null;
    if (grew > 0) el.scrollTop += grew;
  }, [history.rows.length]);

  useEffect(() => {
    const el = scrollContainerRef.current;

    /*
     * Only follow the conversation for someone already at the end of it. Yanking
     * a reader out of history because somebody posted is the fastest way to make
     * history unusable — and it is now reachable, so this matters.
     */
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight > 250) return;

    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  const lastRealId = messages.filter((m) => !m.id.startsWith("opt-")).at(-1)?.id;
  useEffect(() => {
    void markRoomRead(slug, lastRealId);
  }, [slug, lastRealId]);

  /**
   * Instant optimistic message send handler.
   */
  const handleSend = useCallback(
    async (event?: React.FormEvent) => {
      if (event) event.preventDefault();

      const text = draft.trim();
      if (!text || !canPost) return;

      const replyTarget = replyingTo;
      const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const optimisticMessage: MessageRow = {
        id: tempId,
        body: text,
        createdAt: new Date(),
        editedAt: null,
        authorId: meId,
        authorUsername: meUsername,
        authorAvatarUrl: meAvatarUrl ?? null,
        readByAll: false,
        replyToId: replyTarget?.id ?? null,
        replyTo: replyTarget
          ? {
              id: replyTarget.id,
              authorUsername: replyTarget.authorUsername,
              body: replyTarget.body,
            }
          : null,
        reactions: [],
      };

      // 1. Immediately inject optimistic message into chat messages
      queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], (prev = []) => [
        ...prev,
        optimisticMessage,
      ]);

      // 2. Immediately update chat list preview & timestamp
      queryClient.setQueryData<RoomSummary[]>(["chat", "rooms"], (prev = []) => {
        const currentRoom = prev.find((r) => r.slug === slug);
        const updatedRoom: RoomSummary = currentRoom
          ? {
              ...currentRoom,
              lastBody: text,
              lastAuthor: meUsername,
              lastAt: new Date(),
            }
          : {
              id: conversationId,
              slug,
              name,
              topic: null,
              type: "chat",
              unread: 0,
              /* Your own message cannot mention you. */
              mentions: 0,
              avatarUrl,
              lastBody: text,
              lastAuthor: meUsername,
              lastAt: new Date(),
            };
        return [updatedRoom, ...prev.filter((r) => r.slug !== slug)];
      });

      // 3. Clear draft and states instantly
      setDraft("");
      setReplyingTo(null);
      setMention(null);
      setSendError(null);

      /*
       * The grown height is an inline style, so clearing the text does not undo
       * it — without this the composer keeps the height of the longest message
       * sent in the session and never comes back down.
       */
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.overflowY = "hidden";
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Auto scroll
      requestAnimationFrame(() => scrollToBottom(true));

      // 4. Send to server in background
      try {
        const result = await sendMessageAction(slug, text, replyTarget?.id ?? null);
        if (result.ok && result.message) {
          const settled = result.message;
          queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], (prev = []) =>
            prev.map((m) => (m.id === tempId ? settled : m)),
          );
        } else if (!result.ok) {
          // Revert optimistic message and show error
          queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], (prev = []) =>
            prev.filter((m) => m.id !== tempId),
          );
          setSendError(result.error ?? "Failed to send message.");
        }
      } catch {
        queryClient.setQueryData<MessageRow[]>(["chat", "messages", slug], (prev = []) =>
          prev.filter((m) => m.id !== tempId),
        );
        setSendError("Network error. Please try again.");
      }
    },
    [
      draft,
      canPost,
      replyingTo,
      meId,
      meUsername,
      meAvatarUrl,
      queryClient,
      slug,
      conversationId,
      name,
      avatarUrl,
      scrollToBottom,
    ],
  );

  /**
   * WhatsApp's phrasing, which is really three cases: one name, two names, and
   * a count once it stops being worth reading them all out.
   */
  const typingLabel = useMemo(() => {
    const names = typing.map((t) => `@${t.username}`);

    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;

    return `${names[0]}, ${names[1]} and ${names.length - 2} other${
      names.length - 2 === 1 ? "" : "s"
    } are typing…`;
  }, [typing]);

  /** Everything paged in, then the live page. */
  const timeline = useMemo(() => {
    if (history.rows.length === 0) return messages;
    const seen = new Set(messages.map((m) => m.id));
    return [...history.rows.filter((m) => !seen.has(m.id)), ...messages];
  }, [history.rows, messages]);

  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  /**
   * Day separators and bubble grouping are derived cleanly from message stream.
   */
  const rendered = useMemo(
    () =>
      timeline.map((message, index) => {
        const previous = index > 0 ? timeline[index - 1] : null;

        const showDay = !previous || dayOf(message.createdAt) !== dayOf(previous.createdAt);

        const withinWindow = (a: MessageRow, b: MessageRow) =>
          Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <
          GROUP_WINDOW_MS;

        const startsRun =
          showDay ||
          !previous ||
          previous.authorId !== message.authorId ||
          !withinWindow(previous, message);

        return {
          message,
          showDay,
          startsRun,
          /* The first message they have not read. */
          startsUnread: message.id === marker.firstUnreadId,
        };
      }),
    [timeline, marker.firstUnreadId],
  );

  /**
   * Where the room opens, decided once.
   *
   * A mention wins over the plain unread line: if somebody named you, that is
   * the thing you came back for, and it can be well above the first message you
   * had not read. Failing both, the bottom — which is where a room with nothing
   * waiting should always land.
   *
   * Layout effect, so the position is set before the first paint rather than
   * shown at the bottom and then jumped — and keyed on the room, so it runs once
   * on arrival rather than every time a message lands.
   */
  useLayoutEffect(() => {
    const anchorId = marker.firstMentionId ?? marker.firstUnreadId;
    /* Named apart from the prepend anchor ref above, which is a different thing. */
    const target = anchorId ? document.getElementById(`msg-${anchorId}`) : null;

    if (target) {
      target.scrollIntoView({ block: "center" });
      return;
    }

    scrollToBottom(false);
    /* Deliberately only the room: this decides where you arrive, once. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col bg-surface">
        {/* Header Bar */}
        <div className="flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur-md z-10">
          {/* Back to chat list on mobile */}
          <Link
            href="/chat"
            aria-label="Back to chats"
            className="-ml-1 rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-ink active:scale-95 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => setPanel({ kind: "group" })}
            aria-label="Open group info"
            className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            <div className="relative shrink-0">
              <Avatar src={avatarUrl} name={name || slug} size={42} className="ring-1 ring-line/50" />
              {stats.active > 0 && (
                <span
                  title={`${stats.active} online`}
                  className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-bold text-ink tracking-tight">{name}</h1>
              </div>
              {/*
                Typing replaces the counts rather than sitting beside them. The
                subtitle is one line, and while somebody is mid-sentence that is
                the more useful thing for it to say.
              */}
              {typingLabel ? (
                <p className="truncate text-[12px] font-medium text-accent">{typingLabel}</p>
              ) : (
                <p className="truncate text-[12px] text-muted font-medium">
                  {stats.total} {stats.total === 1 ? "member" : "members"}
                  {stats.active > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {` · ${stats.active} online`}
                    </span>
                  )}
                  {note ? ` · ${note}` : ""}
                </p>
              )}
            </div>
          </button>

          {/* Search Button */}
          <button
            type="button"
            onClick={() => setPanel({ kind: "search" })}
            aria-label="Search messages"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-all hover:bg-raised hover:text-ink active:scale-90"
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
        </div>

        {/* Pinned Message Banner */}
        {pinned && (
          <div className="flex w-full items-center justify-between border-b border-line bg-surface/95 px-4 py-2 text-left backdrop-blur-sm transition-colors hover:bg-raised/60">
            <button
              type="button"
              onClick={() => jumpTo(pinned.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                  <path
                    d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-accent">
                  Pinned Message
                </span>
                <span className="block truncate text-[12.5px] text-muted">
                  <span className="font-semibold text-ink">
                    @{pinned.authorUsername ?? "deleted"}:
                  </span>{" "}
                  {pinned.body}
                </span>
              </span>
            </button>

            {canPin && (
              <button
                type="button"
                onClick={() => togglePin(pinned.id)}
                title="Unpin message"
                className="ml-2 rounded p-1 text-muted hover:bg-raised hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Message Stream */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="chat-pattern relative flex-1 overflow-y-auto"
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col px-3 py-4 sm:px-6">
            {rendered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-raised text-muted shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                    <path
                      d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink">No messages yet</p>
                <p className="mt-1 text-xs text-muted">
                  Be the first one to say hello in this group!
                </p>
              </div>
            )}

            {/*
              Only speaks when there is something to say. In the common case the
              next page has already arrived before the top is reached, and a
              spinner that flashes on every page is worse than no spinner.
            */}
            {rendered.length > 0 && (fetchingOlder || history.reachedStart) && (
              <div className="flex justify-center py-4">
                {fetchingOlder ? (
                  <span className="flex items-center gap-2 text-[11px] text-muted">
                    <span
                      aria-hidden
                      className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-line-strong border-t-accent motion-reduce:animate-none"
                    />
                    Loading earlier messages
                  </span>
                ) : (
                  <span className="rounded-full bg-bubble-in px-3.5 py-1 text-[11px] font-medium text-bubble-meta shadow-sm border border-line/40">
                    The beginning of {name}
                  </span>
                )}
              </div>
            )}

            {rendered.map(({ message, showDay, startsRun, startsUnread }) => {
              const isMine = message.authorId === meId;
              const isPending = message.id.startsWith("opt-");

              return (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  className={`rounded-xl transition-colors ${startsRun ? "mt-2.5" : "mt-0.5"}`}
                >
                  {/*
                    Sits above the day separator when both fall here, because
                    the day is a fact about the message and this is a fact about
                    the reader — the outer frame belongs on the outside.
                  */}
                  {startsUnread && (
                    <div className="flex items-center gap-3 py-3">
                      <span className="h-px flex-1 bg-accent/35" />
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-accent">
                        {marker.unread} new {marker.unread === 1 ? "message" : "messages"}
                      </span>
                      <span className="h-px flex-1 bg-accent/35" />
                    </div>
                  )}

                  {showDay && (
                    <div className="flex justify-center py-4">
                      <span className="rounded-full bg-bubble-in px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-bubble-meta shadow-sm border border-line/40">
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
            {/*
              One bubble however many people are typing, with the faces stacked
              beside it. A bubble each would be right for a two-person chat and
              wrong here: a room this size can have a dozen people mid-sentence,
              and a dozen rows of dots would push the conversation off screen.
              The header names them; this says somebody is there.
            */}
            {typing.length > 0 && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <span className="flex -space-x-2">
                  {typing.slice(0, 3).map((person) => (
                    <Avatar
                      key={person.username}
                      src={person.avatarUrl}
                      name={person.username}
                      size={26}
                      className="ring-2 ring-surface"
                    />
                  ))}
                </span>

                {typing.length > 3 && (
                  <span className="text-[11px] font-medium text-muted">
                    +{typing.length - 3}
                  </span>
                )}

                <span
                  aria-hidden
                  className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-bubble-in px-3 py-2.5 shadow-sm"
                >
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                </span>

                {/* The animation is decorative; this is what a screen reader gets. */}
                <span className="sr-only">{typingLabel}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Floating "Scroll to bottom" button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              aria-label="Scroll to latest messages"
              className="absolute right-5 bottom-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-line hover:bg-raised active:scale-95 transition-all duration-150 animate-in fade-in zoom-in-95"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Composer Bar */}
        <div className="border-t border-line bg-surface/95 backdrop-blur-md">
          <div className="mx-auto w-full max-w-4xl px-3 py-2.5 sm:px-6">
            {canPost ? (
              <form onSubmit={handleSend} className="relative">
                {/* Replying-to Preview Bar */}
                {replyingTo && (
                  <div className="mb-2 flex items-center justify-between overflow-hidden rounded-xl bg-raised/80 px-3 py-2 border border-line/60 animate-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        aria-hidden
                        className="h-8 w-1 rounded-full shrink-0 bg-accent"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[12px] font-bold text-accent">
                          Replying to @{replyingTo.authorUsername ?? "deleted"}
                        </span>
                        <span className="block truncate text-[12.5px] text-muted">
                          {replyingTo.body}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      aria-label="Cancel reply"
                      className="ml-2 rounded-full p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
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

                  <textarea
                    ref={textareaRef}
                    name="body"
                    rows={1}
                    required
                    maxLength={4000}
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      /* Only while there is something to type — clearing the box
                         is not typing, and neither is tabbing through it. */
                      if (event.target.value.trim()) pingTyping();
                      setMention(
                        activeMentionQuery(event.target.value, event.target.selectionStart ?? 0),
                      );

                      /*
                       * Grow to fit, then scroll only once it cannot grow any
                       * more. A scrollbar in a box that is still getting taller
                       * is reporting a limit that has not been reached — and on
                       * a one-line composer it just makes an empty field look
                       * busy.
                       *
                       * Height is cleared first because scrollHeight cannot
                       * shrink below the height already set on the element, so
                       * without it the box grows and never comes back down.
                       */
                      const box = event.target;
                      box.style.height = "auto";
                      const wanted = box.scrollHeight;
                      box.style.height = `${Math.min(wanted, COMPOSER_MAX_HEIGHT)}px`;
                      box.style.overflowY = wanted > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
                    }}
                    onSelect={(event) => {
                      const el = event.currentTarget;
                      setMention(activeMentionQuery(el.value, el.selectionStart ?? 0));
                    }}
                    onBlur={() => {
                      // Slight timeout so picking an item from mention menu isn't prevented
                      window.setTimeout(() => setMention(null), 200);
                    }}
                    placeholder="Type a message… (Press Enter to send, Shift+Enter for new line)"
                    className="max-h-36 flex-1 resize-none overflow-y-hidden rounded-2xl bg-raised/80 px-4 py-2.5 text-[14.5px] text-ink outline-none placeholder:text-faint/80 border border-transparent focus:border-accent/40 focus:bg-surface transition-all"
                    onKeyDown={(event) => {
                      if (mention) return;

                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      } else if (event.key === "Escape" && replyingTo) {
                        setReplyingTo(null);
                      }
                    }}
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={draft.trim().length === 0}
                    aria-label="Send message"
                    title="Send"
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-md transition-all duration-150 hover:brightness-105 active:scale-90 disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" aria-hidden>
                      <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z" fill="currentColor" />
                    </svg>
                  </button>
                </div>

                {(sendError ?? reactError) && (
                  <p className="mt-2 px-1 text-xs font-semibold text-danger">
                    {sendError ?? reactError}
                  </p>
                )}
              </form>
            ) : (
              <div className="py-2.5 text-center text-xs font-medium text-muted bg-raised/50 rounded-xl">
                {postDeniedReason}
              </div>
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
