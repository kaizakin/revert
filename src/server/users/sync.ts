import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { checkUsername } from "@/lib/username";
import { db } from "@/server/db";
import {
  conversationMembers,
  conversations,
  notificationPrefs,
  spaceMembers,
  spaces,
  users,
} from "@/server/db/schema";
import { defaultLevelForRoom } from "@/server/notifications/defaults";

export type DbUser = typeof users.$inferSelect;

const DEFAULT_SPACE_SLUG = "revert";

function primaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const primaryId = user.primaryEmailAddressId;
  const match = user.emailAddresses.find((e) => e.id === primaryId);
  return match?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

/** Look up the row for the signed-in Clerk user. Does not create anything. */
export async function getDbUser(): Promise<DbUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [row] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  return row ?? null;
}

/** Ensure a newly synced user is a member of the default space and its rooms. */
export async function ensureDefaultSpaceMembership(userId: string): Promise<void> {
  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.slug, DEFAULT_SPACE_SLUG))
    .limit(1);

  if (!space) return;

  await db
    .insert(spaceMembers)
    .values({ spaceId: space.id, userId, role: "member" })
    .onConflictDoNothing();

  const rooms = await db
    .select()
    .from(conversations)
    .where(eq(conversations.spaceId, space.id));

  const joinable = rooms.filter((r) => r.isDefault);

  if (joinable.length > 0) {
    await db
      .insert(conversationMembers)
      .values(joinable.map((room) => ({ conversationId: room.id, userId })))
      .onConflictDoNothing();

    await db
      .insert(notificationPrefs)
      .values(
        joinable.map((room) => ({
          userId,
          conversationId: room.id,
          level: defaultLevelForRoom(room.type, 0),
        })),
      )
      .onConflictDoNothing();
  }

  await db
    .insert(notificationPrefs)
    .values({
      userId,
      conversationId: null,
      level: "all" as const,
    })
    .onConflictDoNothing();
}

/**
 * Return the row for the signed-in user, creating it if this is their first
 * request. Returns null when Clerk has no username yet — the caller should
 * send them to onboarding to claim one rather than inventing a placeholder,
 * because a placeholder would consume a real name in a unique index.
 */
export async function ensureDbUser(): Promise<DbUser | null> {
  const existing = await getDbUser();
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = primaryEmail(clerkUser);
  if (!email) return null;

  const candidate = clerkUser.username ? checkUsername(clerkUser.username) : null;
  if (!candidate?.ok) return null;

  return upsertFromClerk({
    clerkId: clerkUser.id,
    username: candidate.username,
    email,
    avatarUrl: clerkUser.imageUrl ?? null,
    displayName:
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null,
  });
}

export type ClerkSyncInput = {
  clerkId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  displayName?: string | null;
};

/**
 * Upsert on clerk_id. Deliberately does not touch headline, about, company,
 * college, location or the privacy toggles — those are owned by the user
 * inside Revert, and a Clerk profile update must never overwrite them.
 */
export async function upsertFromClerk(input: ClerkSyncInput): Promise<DbUser> {
  const [row] = await db
    .insert(users)
    .values({
      clerkId: input.clerkId,
      username: input.username,
      email: input.email,
      avatarUrl: input.avatarUrl ?? null,
      displayName: input.displayName ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: input.email,
        avatarUrl: input.avatarUrl ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (row?.id) {
    await ensureDefaultSpaceMembership(row.id);
  }

  return row;
}

/** Soft delete, so authored messages keep a stable author reference. */
export async function softDeleteByClerkId(clerkId: string): Promise<void> {
  await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId));
}
