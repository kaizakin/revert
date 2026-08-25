import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/server/db";
import {
  conversationMembers,
  conversations,
  mentions,
  messages,
  users,
} from "@/server/db/schema";
import { transport } from "@/server/realtime";

import { getRoomForUser, type MessageRow } from "./queries";
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
 * Persist a message, then fan it out. Order matters: the database is the source
 * of truth, and realtime only broadcasts what is already committed. A client
 * must never be told about a message that failed to save.
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

  const inserted = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(messages)
      .values({
        conversationId: room.id,
        authorId: author.id,
        kind: "text",
        body,
        replyToId: replyTo?.id ?? null,
      })
      .returning({
        id: messages.id,
        body: messages.body,
        createdAt: messages.createdAt,
        editedAt: messages.editedAt,
        replyToId: messages.replyToId,
      });

    if (handles.length) {
      /**
       * @all resolves to every other member of the room, so it is a membership
       * lookup rather than a username lookup. The author is excluded — nobody
       * needs a notification about their own message.
       */
      const mentionsAll = handles.includes(MENTION_ALL);

      const named = handles.filter((h) => h !== MENTION_ALL);

      const mentioned = mentionsAll
        ? await tx
            .select({ id: users.id })
            .from(conversationMembers)
            .innerJoin(users, eq(users.id, conversationMembers.userId))
            .where(
              and(
                eq(conversationMembers.conversationId, room.id),
                ne(conversationMembers.userId, author.id),
                isNull(users.deletedAt),
              ),
            )
        : named.length
          ? await tx
              .select({ id: users.id })
              .from(users)
              .where(and(inArray(users.username, named), isNull(users.deletedAt)))
          : [];

      if (mentioned.length) {
        await tx
          .insert(mentions)
          .values(mentioned.map((m) => ({ messageId: row.id, userId: m.id })))
          .onConflictDoNothing();
      }
    }

    return row;
  });

  const messageRow: MessageRow = {
    id: inserted.id,
    body: inserted.body,
    createdAt: inserted.createdAt,
    editedAt: inserted.editedAt,
    authorId: author.id,
    authorUsername: author.username,
    authorAvatarUrl: author.avatarUrl,
    replyToId: inserted.replyToId,
    readByAll: false,
    replyTo,
    reactions: [],
  };

  // Publish to realtime asynchronously without blocking the client response
  void transport
    .publish({
      type: "message.new",
      conversationId: room.id,
      messageId: inserted.id,
    })
    .catch((err) => console.error("[realtime] publish error", err));

  return { ok: true, messageId: inserted.id, message: messageRow };
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
