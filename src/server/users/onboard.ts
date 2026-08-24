import { count, eq } from "drizzle-orm";

import { checkUsername } from "@/lib/username";
import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import {
  conversationMembers,
  conversations,
  notificationPrefs,
  spaceMembers,
  spaces,
  users,
} from "@/server/db/schema";
import { inviteRequired } from "@/server/invites/policy";
import { redeemInvite } from "@/server/invites/redeem";
import { defaultLevelForRoom } from "@/server/notifications/defaults";

export const DEFAULT_SPACE_SLUG = "revert";

export type OnboardField = "username" | "invite" | "form";

export type OnboardInput = {
  clerkId: string;
  email: string;
  username: string;
  inviteCode: string;
  avatarUrl?: string | null;
  displayName?: string | null;
};

export type OnboardResult =
  | { ok: true; userId: string; username: string }
  | { ok: false; field: OnboardField; error: string };

/** Aborts the transaction while carrying which field to blame. */
class OnboardError extends Error {
  constructor(
    readonly field: OnboardField,
    message: string,
  ) {
    super(message);
    this.name = "OnboardError";
  }
}

/**
 * Create the account for real: claim the username, redeem the invite, join the
 * space and its default rooms, and write notification preferences.
 *
 * All of it in one transaction. A half-finished signup is worse than a failed
 * one — an invite consumed with no user, or a user in no rooms, both need
 * manual repair later.
 *
 * Order matters: the user row has to exist before the invite is redeemed,
 * because invite_redemptions references users.id.
 */
export async function completeOnboarding(input: OnboardInput): Promise<OnboardResult> {
  const candidate = checkUsername(input.username);
  if (!candidate.ok) return { ok: false, field: "username", error: candidate.error };
  const username = candidate.username;

  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.slug, DEFAULT_SPACE_SLUG))
    .limit(1);

  if (!space) {
    return { ok: false, field: "form", error: "The community is not set up yet." };
  }

  const rooms = await db
    .select()
    .from(conversations)
    .where(eq(conversations.spaceId, space.id));

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, space.id));

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          clerkId: input.clerkId,
          username,
          email: input.email,
          avatarUrl: input.avatarUrl ?? null,
          displayName: input.displayName ?? null,
        })
        .returning();

      // A code is still honoured when supplied, even with the gate off, so
      // wave tracking and labelled codes keep working.
      const codeGiven = input.inviteCode.trim().length > 0;

      if (inviteRequired() || codeGiven) {
        const redeemed = await redeemInvite(tx, input.inviteCode, user.id);
        if (!redeemed.ok) {
          // Only block signup when a code is actually required. Otherwise a
          // typo in an optional field must not cost someone their account.
          if (inviteRequired()) {
            // Throwing rolls the whole thing back, so the user row and the
            // invite use count both revert together.
            throw new OnboardError("invite", redeemed.error);
          }
        }
      }

      await tx.insert(spaceMembers).values({
        spaceId: space.id,
        userId: user.id,
        role: "member",
      });

      const joinable = rooms.filter((r) => r.isDefault);

      if (joinable.length) {
        await tx.insert(conversationMembers).values(
          joinable.map((room) => ({ conversationId: room.id, userId: user.id })),
        );

        await tx.insert(notificationPrefs).values(
          joinable.map((room) => ({
            userId: user.id,
            conversationId: room.id,
            level: defaultLevelForRoom(room.type, Number(memberCount)),
          })),
        );
      }

      // Global fallback row, used for any room joined later.
      await tx.insert(notificationPrefs).values({
        userId: user.id,
        conversationId: null,
        level: "all" as const,
      });

      return { userId: user.id, username };
    });

    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof OnboardError) {
      return { ok: false, field: err.field, error: err.message };
    }

    // A unique violation here is a real race: someone took the name between
    // the availability check and the insert. The index is the authority, not
    // the pre-check, so this path has to produce a useful message.
    if (isUniqueViolation(err, "users_username_lower_uq")) {
      return { ok: false, field: "username", error: "That username is already taken." };
    }
    if (isUniqueViolation(err, "users_username_unique")) {
      return { ok: false, field: "username", error: "That username is already taken." };
    }
    if (isUniqueViolation(err, "users_clerk_id_unique")) {
      return { ok: false, field: "form", error: "This account is already set up." };
    }

    console.error("[onboard] failed", err);
    return { ok: false, field: "form", error: "Something went wrong. Try again." };
  }
}

/** True when the username is free. Advisory only — the unique index decides. */
export async function isUsernameAvailable(raw: string): Promise<boolean> {
  const candidate = checkUsername(raw);
  if (!candidate.ok) return false;

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, candidate.username))
    .limit(1);

  return !row;
}
