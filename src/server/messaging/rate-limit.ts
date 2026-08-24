import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import { rateLimits } from "@/server/db/schema";

/**
 * Fixed-window counter in Postgres.
 *
 * Not the most precise algorithm — a burst can straddle two windows — but it is
 * one atomic statement with no extra infrastructure, and the point here is
 * stopping flooding, not perfect fairness. Move to Redis if writes get heavy.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        // Reset the window if it has expired, otherwise increment.
        count: sql`case
          when ${rateLimits.windowStart} < now() - (${windowSeconds} * interval '1 second')
          then 1
          else ${rateLimits.count} + 1
        end`,
        windowStart: sql`case
          when ${rateLimits.windowStart} < now() - (${windowSeconds} * interval '1 second')
          then now()
          else ${rateLimits.windowStart}
        end`,
      },
    })
    .returning({ count: rateLimits.count });

  const used = row?.count ?? 1;
  return { allowed: used <= limit, remaining: Math.max(0, limit - used) };
}

export const MESSAGE_LIMIT = { max: 20, windowSeconds: 60 };
