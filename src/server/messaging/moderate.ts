import { and, eq, isNull } from "drizzle-orm";

import { fallbackSystemText } from "@/lib/moderation";
import {
  banExpiry,
  canModerate,
  isAdmin,
  type BanDuration,
  type MemberRole,
} from "@/lib/moderation";
import { db } from "@/server/db";
import {
  conversationMembers,
  messages,
  users,
  type SystemMeta,
} from "@/server/db/schema";
import { transport } from "@/server/realtime";

export type ModerationResult = { ok: true } | { ok: false; error: string };

/**
 * Moderation, kept apart from the read queries.
 *
 * Every function here re-checks who is asking rather than trusting the caller.
 * A server action is a public endpoint: the ids arrive from a browser, and
 * "the UI only shows this button to mods" is a statement about the UI.
 */

/**
 * Take a message down for everybody.
 *
 * Soft delete, because a room's history is a record: the read queries already
 * skip anything with deletedAt set, and keeping the row means a report filed
 * about a message still has something to point at after it is removed.
 */
export async function deleteMessage(
  actorId: string,
  messageId: string,
): Promise<ModerationResult> {
  const [actor] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  if (!actor || !canModerate(actor.role)) {
    return { ok: false, error: "Only mods can delete messages." };
  }

  /* Membership of the room the message is in, not just of some room. */
  const [target] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, actorId),
      ),
    )
    .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
    .limit(1);

  if (!target) return { ok: false, error: "That message is already gone." };

  await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, messageId));

  void transport
    .publish({ type: "message.deleted", conversationId: target.conversationId, messageId })
    .catch((err: unknown) => console.error("[realtime] delete publish error", err));

  return { ok: true };
}

/**
 * Stop somebody posting, for a while or for good.
 *
 * The ban is on the person rather than on their membership of one room, which
 * matches what it is for: somebody being abusive in the only room that exists
 * should not simply move rooms. When there are many rooms this is the thing to
 * revisit.
 */
export async function banUser(
  actorId: string,
  targetUserId: string,
  duration: BanDuration,
  /** Where to announce it. Omitted when there is no room to announce in. */
  conversationId?: string,
): Promise<ModerationResult> {
  if (actorId === targetUserId) {
    return { ok: false, error: "You cannot ban yourself." };
  }

  const [actor] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  if (!actor || !canModerate(actor.role)) return { ok: false, error: "Only mods can do that." };

  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(and(eq(users.id, targetUserId), isNull(users.deletedAt)))
    .limit(1);

  if (!target) return { ok: false, error: "That account is no longer available." };

  /* Nobody can ban sideways or upwards. Two people holding the button and
     disagreeing is a race whose winner is whoever clicked first. */
  if (canModerate(target.role)) return { ok: false, error: "You cannot ban another mod." };

  const until = banExpiry(duration);

  await db
    .update(users)
    .set({ bannedUntil: until, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  if (conversationId) {
    const [named] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    const [actorNamed] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1);

    await postSystemMessage(conversationId, {
      action: "ban",
      target: named?.username ?? "someone",
      actor: actorNamed?.username ?? "a moderator",
      until: duration === "forever" ? null : until.toISOString(),
    });
  }

  return { ok: true };
}

export async function unbanUser(
  actorId: string,
  targetUserId: string,
): Promise<ModerationResult> {
  const [actor] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  if (!actor || !canModerate(actor.role)) return { ok: false, error: "Only mods can do that." };

  await db
    .update(users)
    .set({ bannedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  return { ok: true };
}


/**
 * Leave a note in the room saying what happened.
 *
 * Moderation that nobody can see looks like people vanishing for no reason. A
 * line in the conversation is the difference between a room with rules and a
 * room where things happen to you — and it is the record, since the message
 * stays in history like any other.
 *
 * Author is null: this is the room speaking, not a person, and attributing it
 * to the mod would put their name on something they did not type.
 */
async function postSystemMessage(conversationId: string, meta: SystemMeta) {
  const [row] = await db
    .insert(messages)
    .values({
      conversationId,
      authorId: null,
      kind: "system",
      /* A readable fallback, for anything reading rows without the renderer. */
      body: fallbackSystemText(meta),
      meta,
    })
    .returning({ id: messages.id });

  void transport
    .publish({ type: "message.new", conversationId, messageId: row.id })
    .catch((err: unknown) => console.error("[realtime] system publish error", err));
}

/**
 * Promote or demote somebody.
 *
 * Admin only, and deliberately not something a moderator can do: a moderator
 * who can appoint moderators is an admin with extra steps, and one who can
 * demote another is a way to lose the whole moderation team to one argument.
 */
export async function setRole(
  actorId: string,
  targetUserId: string,
  role: MemberRole,
  conversationId: string,
): Promise<ModerationResult> {
  if (actorId === targetUserId) {
    return { ok: false, error: "You cannot change your own role." };
  }

  const [actor] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  if (!actor || !isAdmin(actor.role)) {
    return { ok: false, error: "Only the admin can change roles." };
  }

  /* Nobody gets handed the admin's own role through this. */
  if (role === "admin") return { ok: false, error: "There can only be one admin." };

  const [target] = await db
    .select({ username: users.username, role: users.role })
    .from(users)
    .where(and(eq(users.id, targetUserId), isNull(users.deletedAt)))
    .limit(1);

  if (!target) return { ok: false, error: "That account is no longer available." };
  if (target.role === "admin") return { ok: false, error: "You cannot demote the admin." };
  if (target.role === role) return { ok: true };

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  const [actorNamed] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  await postSystemMessage(conversationId, {
    action: role === "moderator" ? "promote" : "demote",
    target: target.username,
    actor: actorNamed?.username ?? "the admin",
  });

  return { ok: true };
}

export { postSystemMessage };
