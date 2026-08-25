import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { conversations, messages, users } from "@/server/db/schema";
import { transport } from "@/server/realtime";

import { getRoomForUser, type MessageRow } from "./queries";
import { messageQueue } from "./queue";
import { consumeRateLimit, MESSAGE_LIMIT } from "./rate-limit";

export const MESSAGE_MAX_LENGTH = 4000;

/** Mentions everyone in the room. Reserved, so no account can shadow it. */
export const MENTION_ALL = "all";

export type SendResult =
  | { ok: true; messageId: string; message: MessageRow }
  | { ok: false; error: string };

/** @username, ignoring emails and any @ that is part of a longer token. */
function extractMentions(body: string): string[] {
  const found = new Set<string>();
  const pattern = /(?:^|[^a-z0-9_@])@([a-z][a-z0-9_]{2,19})\b/gi;

  for (const match of body.matchAll(pattern)) {
    found.add(match[1].toLowerCase());
  }
  return [...found];
}

type Author = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  bannedUntil: Date | null;
};

/**
 * Validates, immediately broadcasts to connected room members, and enqueues to
 * a background FIFO worker to persist in order in PostgreSQL.
 */
export async function sendMessage(
  author: Author,
  roomSlug: string,
  rawBody: string,
  replyToId?: string | null,
): Promise<SendResult> {
  const body = rawBody.trim();

  if (!body) return { ok: false, error: "Message is empty." };
  if (body.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Keep it under ${MESSAGE_MAX_LENGTH} characters.` };
  }

  if (author.bannedUntil && author.bannedUntil > new Date()) {
    return { ok: false, error: "You cannot post right now." };
  }

  // Run room membership check, rate limiting, and parent reply lookup in parallel
  const [room, limit, parent] = await Promise.all([
    getRoomForUser(author.id, roomSlug),
    consumeRateLimit(`msg:${author.id}`, MESSAGE_LIMIT.max, MESSAGE_LIMIT.windowSeconds),
    replyToId
      ? db
          .select({
            id: messages.id,
            body: messages.body,
            authorUsername: users.username,
          })
          .from(messages)
          .leftJoin(users, eq(users.id, messages.authorId))
          .where(and(eq(messages.id, replyToId), isNull(messages.deletedAt)))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  if (!room) return { ok: false, error: "You are not in this room." };

  if (room.type === "announce" && !author.isAdmin) {
    return { ok: false, error: "Only mods post in this room." };
  }

  if (!limit.allowed) {
    return { ok: false, error: "You are sending messages too quickly. Wait a minute." };
  }

  let replyTo: { id: string; authorUsername: string | null; body: string | null } | null = null;
  if (replyToId) {
    if (!parent) return { ok: false, error: "That message is no longer available." };
    replyTo = {
      id: parent.id,
      authorUsername: parent.authorUsername,
      body: parent.body,
    };
  }

  const handles = extractMentions(body);
  const messageId = crypto.randomUUID();
  const createdAt = new Date();

  const messageRow: MessageRow = {
    id: messageId,
    body,
    createdAt,
    editedAt: null,
    authorId: author.id,
    authorUsername: author.username,
    authorAvatarUrl: author.avatarUrl,
    replyToId: replyTo?.id ?? null,
    readByAll: false,
    replyTo,
    reactions: [],
  };

  // 1. Immediately fan out to all connected members in the chat room
  void transport
    .publish({
      type: "message.new",
      conversationId: room.id,
      messageId,
      message: messageRow,
    })
    .catch((err) => console.error("[realtime] broadcast error:", err));

  // 2. Enqueue message to background FIFO queue for database persistence
  messageQueue.enqueue({
    id: messageId,
    conversationId: room.id,
    authorId: author.id,
    kind: "text",
    body,
    replyToId: replyTo?.id ?? null,
    createdAt,
    handles,
  });

  return { ok: true, messageId, message: messageRow };
}

/** Author fields sendMessage needs, loaded once per request. */
export async function loadAuthor(userId: string): Promise<Author | null> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      isAdmin: users.isAdmin,
      bannedUntil: users.bannedUntil,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return row ?? null;
}

/** Rooms are looked up by slug often enough to warrant its own helper. */
export async function conversationIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.slug, slug))
    .limit(1);

  return row?.id ?? null;
}
