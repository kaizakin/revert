import { and, asc, count, desc, eq, gt, inArray, isNull, lt, ne, sql } from "drizzle-orm";

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

/**
 * How many people have actually signed up, for the landing page.
 *
 * Deliberately the only number exposed to signed-out visitors: a member count
 * is social proof, while anything finer grained would be leaking who is here to
 * anyone who loads the page.
 */
export async function publicMemberCount(): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(isNull(users.deletedAt));

  return Number(row?.total ?? 0);
}

export type RoomSummary = {
  id: string;
  slug: string;
  name: string;
  topic: string | null;
  type: "chat" | "announce" | "ama";
  unread: number;
  avatarUrl: string | null;
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
      avatarUrl: conversations.avatarUrl,
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
      avatarUrl: r.avatarUrl,
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
      avatarUrl: conversations.avatarUrl,
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
  /** True once every other member of the room has read it. Own messages only. */
  readByAll: boolean;
  /** The quoted message, when this is a reply. Null if it was deleted. */
  replyTo: { id: string; authorUsername: string | null; body: string | null } | null;
  reactions: ReactionSummary[];
};

/**
 * Newest page of messages, returned oldest-first for rendering.
 * `after` fetches only what arrived since a timestamp, for realtime catch-up.
 */
export async function listMessages(
  conversationId: string,
  viewerId: string,
  opts: {
    limit?: number;
    /** Newer than this — used to catch up on what arrived while polling. */
    after?: Date;
    /** Older than this — used to page backwards through history. */
    before?: Date;
    showReadReceipts?: boolean;
  } = {},
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

  /*
   * Three windows, one shape. `after` walks forward from a known point and so
   * reads in ascending order; the other two take the newest rows that qualify
   * and flip them, because "the 50 before X" means the 50 nearest X, not the 50
   * oldest in the room.
   */
  const window = opts.after
    ? and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt),
        gt(messages.createdAt, opts.after),
      )
    : opts.before
      ? and(
          eq(messages.conversationId, conversationId),
          isNull(messages.deletedAt),
          lt(messages.createdAt, opts.before),
        )
      : and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt));

  const rows = opts.after
    ? await base.where(window).orderBy(asc(messages.createdAt)).limit(limit)
    : (await base.where(window).orderBy(desc(messages.createdAt)).limit(limit)).reverse();

  const byMessage = await loadReactions(
    rows.map((row) => row.id),
    viewerId,
  );

  /**
   * Read state for the viewer's own messages.
   *
   * A message counts as read by everyone only when every other member has a
   * read marker at or after it. Members with no marker at all have not read
   * anything, so the count check has to come first — taking the minimum over
   * whoever happens to have a row would turn blue the moment one person read
   * it.
   *
   * Reciprocity applies: someone who has turned read receipts off does not get
   * to see anyone else's, which is what the setting promises.
   */
  let readCutoff: Date | null = null;
  let showReadReceipts = opts.showReadReceipts;

  if (showReadReceipts === undefined) {
    const [viewer] = await db
      .select({ showReadReceipts: users.showReadReceipts })
      .from(users)
      .where(eq(users.id, viewerId))
      .limit(1);
    showReadReceipts = viewer?.showReadReceipts ?? false;
  }

  if (showReadReceipts) {
    const [{ others }] = await db
      .select({ others: count() })
      .from(conversationMembers)
      .innerJoin(users, eq(users.id, conversationMembers.userId))
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          ne(conversationMembers.userId, viewerId),
          isNull(users.deletedAt),
        ),
      );

    const otherCount = Number(others);

    if (otherCount > 0) {
      const markers = await db
        .select({ at: messageReads.lastReadAt })
        .from(messageReads)
        .innerJoin(users, eq(users.id, messageReads.userId))
        .where(
          and(
            eq(messageReads.conversationId, conversationId),
            ne(messageReads.userId, viewerId),
            isNull(users.deletedAt),
          ),
        );

      if (markers.length >= otherCount) {
        readCutoff = markers.reduce<Date | null>(
          (min, m) => (min === null || m.at < min ? m.at : min),
          null,
        );
      }
    }
  }

  /**
   * Quoted messages are fetched by id rather than joined, because the message
   * being replied to is often older than this page and a join would only find
   * the ones that happen to be on screen.
   */
  const parentIds = [...new Set(rows.map((r) => r.replyToId).filter((v): v is string => !!v))];

  const parents = parentIds.length
    ? await db
        .select({
          id: messages.id,
          body: messages.body,
          deletedAt: messages.deletedAt,
          authorUsername: users.username,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.authorId))
        .where(inArray(messages.id, parentIds))
    : [];

  const parentById = new Map(
    parents
      .filter((p) => !p.deletedAt)
      .map((p) => [p.id, { id: p.id, authorUsername: p.authorUsername, body: p.body }]),
  );

  return rows.map((row) => ({
    ...row,
    readByAll:
      row.authorId === viewerId &&
      readCutoff !== null &&
      row.createdAt.getTime() <= readCutoff.getTime(),
    replyTo: row.replyToId ? (parentById.get(row.replyToId) ?? null) : null,
    reactions: byMessage.get(row.id) ?? [],
  }));
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
  isAdmin: boolean;
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
      isAdmin: users.isAdmin,
      showLastActive: users.showLastActive,
      lastActiveAt: users.lastActiveAt,
      joinedAt: conversationMembers.joinedAt,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(and(eq(conversationMembers.conversationId, conversationId), isNull(users.deletedAt)))
    .orderBy(desc(users.isAdmin), asc(users.username));

  const cutoff = Date.now() - ACTIVE_WINDOW_MINUTES * 60_000;

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    headline: row.headline,
    isAdmin: row.isAdmin,
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

export type PinnedMessage = {
  id: string;
  body: string | null;
  authorUsername: string | null;
};

/** The pinned message for a room, if there is one. */
export async function getPinnedMessage(conversationId: string): Promise<PinnedMessage | null> {
  const [row] = await db
    .select({
      id: messages.id,
      body: messages.body,
      authorUsername: users.username,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.authorId))
    .where(
      and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt),
        sql`${messages.pinnedAt} is not null`,
      ),
    )
    .orderBy(desc(messages.pinnedAt))
    .limit(1);

  return row ?? null;
}

/**
 * Only one pinned message per room, so pinning clears any previous one in the
 * same transaction. Two pinned messages would make the banner ambiguous.
 */
export async function setPinned(
  conversationId: string,
  messageId: string | null,
  actorId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(messages)
      .set({ pinnedAt: null, pinnedBy: null })
      .where(eq(messages.conversationId, conversationId));

    if (messageId) {
      await tx
        .update(messages)
        .set({ pinnedAt: new Date(), pinnedBy: actorId })
        .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)));
    }
  });
}

export type SearchHit = {
  id: string;
  body: string | null;
  createdAt: Date;
  authorUsername: string | null;
};

/**
 * Substring search within one room.
 *
 * ILIKE rather than full-text search: at this size the index would cost more
 * than it saves, and ILIKE matches partial words, which is what people expect
 * from a chat search box. Worth revisiting past a few hundred thousand rows.
 */
export async function searchMessages(
  conversationId: string,
  query: string,
  limit = 30,
): Promise<SearchHit[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];

  // Escape the LIKE wildcards so a literal % or _ does not match everything.
  const escaped = needle.replace(/([%_\\])/g, "\\$1");

  return db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      authorUsername: users.username,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.authorId))
    .where(
      and(
        eq(messages.conversationId, conversationId),
        isNull(messages.deletedAt),
        sql`${messages.body} ilike ${"%" + escaped + "%"} escape '\\'`,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export type RoomEdit = {
  name?: string;
  topic?: string | null;
  avatarUrl?: string | null;
};

/** Rename a room, change its description, or set its picture. */
export async function updateRoom(conversationId: string, patch: RoomEdit): Promise<void> {
  const set: Record<string, unknown> = {};

  if (patch.name !== undefined) set.name = patch.name;
  if (patch.topic !== undefined) set.topic = patch.topic;
  if (patch.avatarUrl !== undefined) set.avatarUrl = patch.avatarUrl;

  if (Object.keys(set).length === 0) return;

  await db.update(conversations).set(set).where(eq(conversations.id, conversationId));
}
