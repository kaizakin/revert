import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { inviteCodes, inviteRedemptions } from "@/server/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RedeemResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

/**
 * Claim one use of an invite code.
 *
 * The guard lives in the UPDATE itself rather than in a read-then-write, so two
 * people racing on the last use of a code cannot both win. Postgres serialises
 * the row update; the loser matches zero rows and gets the error.
 */
export async function redeemInvite(
  tx: Tx,
  rawCode: string,
  userId: string,
): Promise<RedeemResult> {
  const code = rawCode.trim().toLowerCase();
  if (!code) return { ok: false, error: "Enter your invite code." };

  const [claimed] = await tx
    .update(inviteCodes)
    .set({ uses: sql`${inviteCodes.uses} + 1` })
    .where(
      and(
        eq(sql`lower(${inviteCodes.code})`, code),
        sql`${inviteCodes.uses} < ${inviteCodes.maxUses}`,
        or(isNull(inviteCodes.expiresAt), sql`${inviteCodes.expiresAt} > now()`),
      ),
    )
    .returning();

  if (!claimed) {
    return { ok: false, error: "That invite code is invalid, used up or expired." };
  }

  await tx.insert(inviteRedemptions).values({ code: claimed.code, userId });

  return { ok: true, code: claimed.code };
}

/** Read-only pre-check for the form, so the UI can complain before submit. */
export async function inviteLooksValid(rawCode: string): Promise<boolean> {
  const code = rawCode.trim().toLowerCase();
  if (!code) return false;

  const [row] = await db
    .select({ code: inviteCodes.code })
    .from(inviteCodes)
    .where(
      and(
        eq(sql`lower(${inviteCodes.code})`, code),
        sql`${inviteCodes.uses} < ${inviteCodes.maxUses}`,
        or(isNull(inviteCodes.expiresAt), sql`${inviteCodes.expiresAt} > now()`),
      ),
    )
    .limit(1);

  return Boolean(row);
}
