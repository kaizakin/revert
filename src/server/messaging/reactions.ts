import { and, eq, inArray, isNull, sql } from "drizzle-orm";

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
      mine: sql<boolean>`bool_or(${reactions.userId} = ${viewerId})`,
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

  const removed = await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.messageId, messageId),
        eq(reactions.userId, viewerId),
        eq(reactions.emoji, emoji),
      ),
    )
    .returning({ id: reactions.id });

  if (removed.length === 0) {
    await db
      .insert(reactions)
      .values({ messageId, userId: viewerId, emoji })
      .onConflictDoNothing();
  }

  await transport.publish({
    type: "reaction.changed",
    conversationId: target.conversationId,
    messageId,
  });

  return { ok: true, added: removed.length === 0 };
}
