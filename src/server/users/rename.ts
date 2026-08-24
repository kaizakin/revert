import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { checkUsername } from "@/lib/username";
import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { users } from "@/server/db/schema";

export type AvailabilityResult =
  | { status: "available" }
  | { status: "taken" }
  | { status: "invalid"; reason: string }
  | { status: "unchanged" };

/**
 * Advisory only. The unique index on lower(username) is what actually decides,
 * so the rename path has to handle a collision anyway — two people can pass
 * this check for the same name at the same moment.
 */
export async function checkAvailability(
  raw: string,
  currentUsername: string,
): Promise<AvailabilityResult> {
  const candidate = checkUsername(raw);
  if (!candidate.ok) return { status: "invalid", reason: candidate.error };

  if (candidate.username === currentUsername) return { status: "unchanged" };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, candidate.username))
    .limit(1);

  return existing ? { status: "taken" } : { status: "available" };
}

export type RenameResult = { ok: true; username: string } | { ok: false; error: string };

/**
 * Change a username.
 *
 * Our table is authoritative for everything the app shows. Clerk only matters
 * here when usernames are enabled there too, since it can then be used as a
 * sign-in identifier — in which case Clerk goes first: if it rejects the name we
 * have changed nothing, whereas the reverse order can leave Clerk holding a name
 * the app no longer knows about.
 */
export async function renameUser(
  userId: string,
  clerkId: string,
  raw: string,
): Promise<RenameResult> {
  const candidate = checkUsername(raw);
  if (!candidate.ok) return { ok: false, error: candidate.error };

  const [current] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!current) return { ok: false, error: "Account not found." };
  if (current.username === candidate.username) {
    return { ok: true, username: candidate.username };
  }

  /**
   * Only sync Clerk if Clerk is actually holding a username for this account.
   *
   * With usernames disabled in Clerk — which is the setup we want, so that the
   * reserved list and availability check in this codebase are the only rules —
   * Clerk has no username to update and the call would fail on every rename.
   * Reading it first makes this self-configuring rather than depending on a
   * flag that can drift out of sync with the dashboard.
   */
  const clerk = await clerkClient();
  let clerkHasUsername = false;

  try {
    const clerkUser = await clerk.users.getUser(clerkId);
    clerkHasUsername = Boolean(clerkUser.username);
  } catch (err) {
    console.error("[rename] could not read the Clerk user", err);
  }

  if (clerkHasUsername) {
    try {
      await clerk.users.updateUser(clerkId, { username: candidate.username });
    } catch (err) {
      console.error("[rename] clerk rejected", err);
      return { ok: false, error: "That username is not available." };
    }
  }

  try {
    await db
      .update(users)
      .set({ username: candidate.username, updatedAt: new Date() })
      .where(eq(users.id, userId));
  } catch (err) {
    // Put Clerk back, but only if we actually changed it, otherwise the two
    // disagree and username sign-in uses a name the app does not recognise.
    if (clerkHasUsername) {
      try {
        await clerk.users.updateUser(clerkId, { username: current.username });
      } catch (rollbackErr) {
        console.error("[rename] could not roll Clerk back", rollbackErr);
      }
    }

    if (
      isUniqueViolation(err, "users_username_lower_uq") ||
      isUniqueViolation(err, "users_username_unique")
    ) {
      return { ok: false, error: "That username was just taken." };
    }

    console.error("[rename] failed", err);
    return { ok: false, error: "Could not change your username. Try again." };
  }

  return { ok: true, username: candidate.username };
}
