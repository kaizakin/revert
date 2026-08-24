import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";

import type { ReactionSummary } from "@/lib/reactions";
import { db } from "@/server/db";
import {
  conversationMembers,
  conversations,
  messageReads,
  messages,
  spaces,
  users,
} from "@/server/db/schema";
import { DEFAULT_SPACE_SLUG } from "@/server/users/onboard";

import { loadReactions } from "./reactions";

export const MESSAGE_PAGE_SIZE = 50;

export type RoomSummary = {
  id: string;
  slug: string;
  name: string;
  topic: string | null;
  type: "chat" | "announce" | "ama";
  unread: number;
  lastBody: string | null;
  lastAuthor: string | null;
  lastAt: Date | null;
};

/** Rooms the user has joined, with unread counts. */
export async function listRoomsForUser(userId: string): Promise<RoomSummary[]> {
  const rows = await db
    .select({
      id: conversations.id,
      slug: conversations.slug,
      name: conversations.name,
      topic: conversations.topic,
      type: conversations.type,
      lastReadAt: messageReads.lastReadAt,
    })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .innerJoin(spaces, eq(spaces.id, conversations.spaceId))
    .leftJoin(
      messageReads,
      and(
        eq(messageReads.conversationId, conversations.id),
        eq(messageReads.userId, userId),
      ),
    )
    .where(
      and(
        eq(conversationMembers.userId, userId),
        eq(spaces.slug, DEFAULT_SPACE_SLUG),
        isNull(conversations.archivedAt),
      ),
    )
    .orderBy(asc(conversations.slug));

  // Unread counts run as one grouped query rather than one per room.
  const counts = await db
    .select({
      conversationId: messages.conversationId,
      unread: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .leftJoin(
      messageReads,
      and(
        eq(messageReads.conversationId, messages.conversationId),
        eq(messageReads.userId, userId),
      ),
    )
    .where(
      and(
        isNull(messages.deletedAt),
        sql`${messages.authorId} is distinct from ${userId}::uuid`,
        sql`(${messageReads.lastReadAt} is null or ${messages.createdAt} > ${messageReads.lastReadAt})`,
      ),
    )
    .groupBy(messages.conversationId);

  const unreadBy = new Map(counts.map((c) => [c.conversationId, Number(c.unread)]));

  /**
   * Latest message per room for the list preview.
   *
   * DISTINCT ON does this in one indexed pass over
   * (conversation_id, created_at). Fetching a fixed number of recent rows and
   * deduplicating in JS looks equivalent and is not: a room whose last message
   * falls outside that window silently loses its preview.
   */
  const previewRows = await db.execute<{
    conversation_id: string;
    body: string | null;
    created_at: Date;
    username: string | null;
  }>(sql`
    select distinct on (m.conversation_id)
      m.conversation_id, m.body, m.created_at, u.username
    from ${messages} m
    left join ${users} u on u.id = m.author_id
    where m.deleted_at is null
    order by m.conversation_id, m.created_at desc
  `);

  const previewBy = new Map(
    Array.from(previewRows, (row) => [
      row.conversation_id,
      {
        body: row.body,
        createdAt: new Date(row.created_at),
        username: row.username,
      },
    ]),
  );

  const summaries = rows.map((r) => {
    const preview = previewBy.get(r.id);
    return {
      id: r.id,
      slug: r.slug ?? "",
      name: r.name ?? r.slug ?? "",
      topic: r.topic,
      type: r.type,
      unread: unreadBy.get(r.id) ?? 0,
      lastBody: preview?.body ?? null,
      lastAuthor: preview?.username ?? null,
      lastAt: preview?.createdAt ?? null,
    };
  });

  // Most recent conversation first, like any chat app. Silent rooms sink.
  return summaries.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
}

/** The room, but only if this user is a member of it. */
export async function getRoomForUser(userId: string, slug: string) {
  const [row] = await db
    .select({
      id: conversations.id,
      slug: conversations.slug,
      name: conversations.name,
      topic: conversations.topic,
      type: conversations.type,
    })
    .from(conversations)
    .innerJoin(spaces, eq(spaces.id, conversations.spaceId))
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, conversations.id),
        eq(conversationMembers.userId, userId),
      ),
    )
    .where(
      and(
        eq(spaces.slug, DEFAULT_SPACE_SLUG),
        eq(conversations.slug, slug),
        isNull(conversations.archivedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export type MessageRow = {
  id: string;
  body: string | null;
  createdAt: Date;
  editedAt: Date | null;
  authorId: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  replyToId: string | null;
  reactions: ReactionSummary[];
};

/**
 * Newest page of messages, returned oldest-first for rendering.
 * `after` fetches only what arrived since a timestamp, for realtime catch-up.
 */
export async function listMessages(
  conversationId: string,
  viewerId: string,
  opts: { limit?: number; after?: Date } = {},
): Promise<MessageRow[]> {
  const limit = Math.min(opts.limit ?? MESSAGE_PAGE_SIZE, 200);

  const base = db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      authorId: messages.authorId,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
      replyToId: messages.replyToId,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.authorId));

  const rows = opts.after
    ? await base
        .where(
          and(
            eq(messages.conversationId, conversationId),
            isNull(messages.deletedAt),
            gt(messages.createdAt, opts.after),
          ),
        )
        .orderBy(asc(messages.createdAt))
        .limit(limit)
    : (
        await base
          .where(
            and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)),
          )
          .orderBy(desc(messages.createdAt))
          .limit(limit)
      ).reverse();

  const byMessage = await loadReactions(
    rows.map((row) => row.id),
    viewerId,
  );

  return rows.map((row) => ({ ...row, reactions: byMessage.get(row.id) ?? [] }));
}

/** Record how far the user has read. Safe to call often. */
export async function markRead(userId: string, conversationId: string, messageId?: string) {
  await db
    .insert(messageReads)
    .values({
      userId,
      conversationId,
      lastReadMessageId: messageId ?? null,
      lastReadAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [messageReads.userId, messageReads.conversationId],
      set: {
        lastReadMessageId: messageId ?? null,
        lastReadAt: new Date(),
      },
    });
}

/** Member count for the room header. */
export async function roomMemberCount(conversationId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));

  return Number(row?.value ?? 0);
}

/** Considered online if seen within this window. */
export const ACTIVE_WINDOW_MINUTES = 5;

export type RoomStats = { total: number; active: number };

/**
 * Member counts for the room header.
 *
 * `active` only counts people who have not hidden their last-seen. Counting
 * hidden users would leak the very thing the toggle exists to hide — with a
 * small membership, watching the number move tells you who is online.
 */
export async function roomStats(conversationId: string): Promise<RoomStats> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (
        where ${users.showLastActive}
          and ${users.lastActiveAt} > now() - (${ACTIVE_WINDOW_MINUTES} * interval '1 minute')
      )::int`,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(and(eq(conversationMembers.conversationId, conversationId), isNull(users.deletedAt)));

  return { total: Number(row?.total ?? 0), active: Number(row?.active ?? 0) };
}

export type RoomMember = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  isOnline: boolean;
  joinedAt: Date;
};

/** Everyone in the room, for the group info panel. */
export async function listRoomMembers(conversationId: string): Promise<RoomMember[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      headline: users.headline,
      showLastActive: users.showLastActive,
      lastActiveAt: users.lastActiveAt,
      joinedAt: conversationMembers.joinedAt,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(and(eq(conversationMembers.conversationId, conversationId), isNull(users.deletedAt)))
    .orderBy(asc(users.username));

  const cutoff = Date.now() - ACTIVE_WINDOW_MINUTES * 60_000;

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    headline: row.headline,
    isOnline:
      row.showLastActive && row.lastActiveAt ? row.lastActiveAt.getTime() > cutoff : false,
    joinedAt: row.joinedAt,
  }));
}

/**
 * Stamp the user as recently seen.
 *
 * Nothing else wrote lastActiveAt, so the online count would have been
 * permanently zero. Called from the read marker, which fires when a room is
 * open, so it doubles as a cheap heartbeat.
 */
export async function touchLastActive(userId: string): Promise<void> {
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, userId));
}
