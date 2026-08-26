import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { isAllowedEmoji, type ReactionSummary } from "@/lib/reactions";
import { db } from "@/server/db";
import { conversationMembers, messages, reactions, users } from "@/server/db/schema";
import { transport } from "@/server/realtime";

/**
 * Reactions for a page of messages, as one query.
 *
 * Loading them per message would be one round trip per bubble, which at 50
 * messages a page is 50 queries for decoration.
 */
export async function loadReactions(
  messageIds: string[],
  viewerId: string,
): Promise<Map<string, ReactionSummary[]>> {
  const byMessage = new Map<string, ReactionSummary[]>();
  if (messageIds.length === 0) return byMessage;

  const rows = await db
    .select({
      messageId: reactions.messageId,
      emoji: reactions.emoji,
      count: sql<number>`count(*)::int`,
      mine: sql<boolean>`bool_or(${reactions.userId} = ${viewerId}::uuid)`,
    })
    .from(reactions)
    .where(inArray(reactions.messageId, messageIds))
    .groupBy(reactions.messageId, reactions.emoji)
    .orderBy(reactions.emoji);

  for (const row of rows) {
    const list = byMessage.get(row.messageId) ?? [];
    list.push({ emoji: row.emoji, count: Number(row.count), mine: Boolean(row.mine) });
    byMessage.set(row.messageId, list);
  }

  return byMessage;
}

export type ToggleResult = { ok: true; added: boolean } | { ok: false; error: string };

/**
 * Add or remove the viewer's reaction. One reaction per person per emoji, which
 * the unique index enforces; this only decides which way to flip.
 */
export async function toggleReaction(
  viewerId: string,
  messageId: string,
  emoji: string,
): Promise<ToggleResult> {
  if (!isAllowedEmoji(emoji)) return { ok: false, error: "Unsupported reaction." };

  // Membership is checked here rather than trusted from the caller, because a
  // server action is a public endpoint and messageId is client-supplied.
  const [target] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, viewerId),
      ),
    )
    .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
    .limit(1);

  if (!target) return { ok: false, error: "You cannot react to that message." };

  const [banned] = await db
    .select({ bannedUntil: users.bannedUntil })
    .from(users)
    .where(eq(users.id, viewerId))
    .limit(1);

  if (banned?.bannedUntil && banned.bannedUntil > new Date()) {
    return { ok: false, error: "You cannot react right now." };
  }

  /*
   * One reaction per person per message, the way every chat app people already
   * use behaves. Clearing whatever they had before rather than the one emoji
   * they tapped is what makes a second choice replace the first instead of
   * stacking beside it — and it means a message can never be wider than the few
   * distinct emoji its readers picked.
   */
  const removed = await db
    .delete(reactions)
    .where(and(eq(reactions.messageId, messageId), eq(reactions.userId, viewerId)))
    .returning({ emoji: reactions.emoji });

  /* Tapping the one already chosen means take it off; anything else replaces. */
  const wasSame = removed.some((row) => row.emoji === emoji);

  if (!wasSame) {
    await db
      .insert(reactions)
      .values({ messageId, userId: viewerId, emoji })
      .onConflictDoNothing();
  }

    void transport
      .publish({
        type: "reaction.changed",
        conversationId: target.conversationId,
        messageId,
      })
      .catch((err) => console.error("[realtime] reaction publish error", err));

    return { ok: true, added: removed.length === 0 };
  }


export type ReactorGroup = {
  emoji: string;
  people: { username: string; displayName: string | null; avatarUrl: string | null }[];
};

/**
 * Who reacted to one message, grouped by what they picked.
 *
 * Fetched on demand rather than carried on every message. A room only ever
 * needs this for the one message somebody tapped, and putting names on every
 * reaction in the page payload would cost far more than it is worth — the
 * summary already carries what the bubble draws.
 *
 * Membership is checked rather than trusted: a server action is a public
 * endpoint and the message id comes from the client.
 */
export async function listReactors(
  viewerId: string,
  messageId: string,
): Promise<ReactorGroup[]> {
  const [target] = await db
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, viewerId),
      ),
    )
    .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
    .limit(1);

  if (!target) return [];

  const rows = await db
    .select({
      emoji: reactions.emoji,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      reactedAt: reactions.createdAt,
    })
    .from(reactions)
    .innerJoin(users, eq(users.id, reactions.userId))
    .where(and(eq(reactions.messageId, messageId), isNull(users.deletedAt)))
    .orderBy(asc(reactions.createdAt));

  /* Grouped in order of first appearance, so the list reads as it happened. */
  const groups = new Map<string, ReactorGroup>();

  for (const row of rows) {
    const group = groups.get(row.emoji) ?? { emoji: row.emoji, people: [] };
    group.people.push({
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    });
    groups.set(row.emoji, group);
  }

  return [...groups.values()].sort((a, b) => b.people.length - a.people.length);
}
